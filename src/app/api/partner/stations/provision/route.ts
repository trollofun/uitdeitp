/**
 * POST /api/partner/stations/provision — Academy creează o stație la claim.
 *
 * Contractul complet: docs/RASPUNS_CONTRACT_ACADEMY_2026-08-08.md
 *
 * Academy face UN SINGUR apel ieșit și nu vede niciodată cheia NotifyHub —
 * pe aceea o cerem noi, fiindcă maparea station_id -> notifyhub_api_key_id
 * trebuie să trăiască aici (webhook-ul Gumroad de topup depinde de ea), iar
 * Academy n-are nicio primitivă de criptare în care s-o păstreze.
 *
 * Idempotență: aceeași `Idempotency-Key` întoarce ACELAȘI bundle cât timp nu a
 * expirat. Cheia brută de ingest nu e recuperabilă din baza noastră (ținem doar
 * hash-ul), deci bundle-ul se stochează explicit în Vault, criptat la rest.
 * După expirare: 410 și rotire explicită — nu un telefon la noi.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticatePartner, touchPartnerKey, PartnerAuthError } from '@/lib/partner/keys';
import { generateIngestKey } from '@/lib/integrations/station-keys';
import { checkDurableRateLimit } from '@/lib/api/rate-limit';
import { appUrl } from '@/lib/config/app-url';
import { flags } from '@/lib/config/flags';

export const dynamic = 'force-dynamic';

/** Cât timp o reluare mai poate primi același bundle. */
const BUNDLE_TTL_HOURS = 24;

const bodySchema = z.object({
  academy_station_id: z.string().uuid(),
  rar_code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{1,2}[0-9]{2,4}$/, 'Cod RAR invalid (ex. CT060)'),
  name: z.string().min(2).max(120),
  tier: z.enum(['lite', 'auto']).default('lite'),
  inspector_email: z.string().email(),
  /** Emite o cheie nouă pe aceeași stație; cea veche rămâne validă. */
  rotate: z.boolean().default(false),
});

function fail(code: string, status: number, message: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ success: false, error: message, code, ...extra }, { status });
}

function slugFrom(name: string, rarCode: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    // Diacriticele descompuse de NFD; scris cu escape-uri ca să nu depindă de
    // encoding-ul fișierului.
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return base ? `${base}-${rarCode.toLowerCase()}` : rarCode.toLowerCase();
}

export async function POST(req: NextRequest) {
  if (!flags.partnerProvisionEnabled) {
    return fail('provisioning_disabled', 503, 'Provisionarea automată nu e activată');
  }

  let partner;
  try {
    partner = await authenticatePartner(req.headers.get('authorization'), 'stations:provision');
  } catch (error) {
    if (error instanceof PartnerAuthError) {
      return fail(error.code, error.statusCode, error.message);
    }
    console.error('[Provision] auth failed:', error);
    return fail('internal_error', 500, 'Eroare internă');
  }

  const idempotencyKey = req.headers.get('idempotency-key')?.trim();
  if (!idempotencyKey) {
    return fail('missing_idempotency_key', 400, 'Header-ul Idempotency-Key este obligatoriu');
  }

  // Limita e generoasă: onboarding-ul e rar, dar o buclă de retry la ei nu
  // trebuie să ne inunde. Fail-open ca peste tot — un limiter căzut nu are
  // voie să blocheze crearea unei stații.
  const limit = await checkDurableRateLimit({
    bucket: 'partner_provision:key',
    key: partner.id,
    limit: 60,
    windowSeconds: 60 * 60,
  });
  if (!limit.allowed) {
    return fail('rate_limited', 429, 'Prea multe cereri de provisionare');
  }

  touchPartnerKey(partner.id);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail('invalid_payload', 400, 'Date invalide', {
      details: parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
  }

  const { rar_code, name, tier, inspector_email, rotate } = parsed.data;
  const supabase = createServiceClient();

  try {
    // --- Reluare -----------------------------------------------------------
    const { data: existing } = await supabase
      .from('partner_provision_requests')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existing && !rotate) {
      // Aceeași cheie cu alt cod RAR = coliziune. Zgomotos, nu o stație tăcut
      // greșită — cerut explicit de Academy.
      if (existing.rar_code !== rar_code) {
        return fail(
          'idempotency_key_conflict',
          409,
          `Cheia de idempotență a fost folosită pentru ${existing.rar_code}, nu pentru ${rar_code}`
        );
      }

      const expired =
        !existing.bundle_expires_at || new Date(existing.bundle_expires_at) < new Date();

      if (expired || !existing.bundle_secret_id) {
        return fail(
          'bundle_expired',
          410,
          'Credențialele nu mai pot fi recuperate. Reia cererea cu "rotate": true.'
        );
      }

      const { data: bundleRaw } = await supabase.rpc('secret_get', {
        p_id: existing.bundle_secret_id,
      });

      if (!bundleRaw) {
        return fail(
          'bundle_expired',
          410,
          'Credențialele nu mai pot fi recuperate. Reia cererea cu "rotate": true.'
        );
      }

      const { data: station } = await supabase
        .from('kiosk_stations')
        .select('id, rar_code, name')
        .eq('id', existing.station_id!)
        .maybeSingle();

      return withNoStore(
        NextResponse.json(
          {
            success: true,
            data: {
              station: { ...station, created: existing.station_created },
              ingest: {
                ...(JSON.parse(bundleRaw as string) as Record<string, unknown>),
                endpoint: `${appUrl()}/api/integrations/reminders`,
              },
              dashboard_url: `${appUrl()}/stations/dashboard`,
              bundle_expires_at: existing.bundle_expires_at,
            },
          },
          { status: 200 }
        )
      );
    }

    // --- Proprietarul, ÎNAINTE de a crea ceva ------------------------------
    // Ordinea contează: dacă emailul nu se rezolvă la un cont confirmat,
    // refuzăm fără să lăsăm în urmă o stație orfană pe care nimeni n-o poate
    // accesa și despre care apelantul crede că e gata. Contractul promite 403.
    const { data: ownerId } = await supabase.rpc('find_user_id_by_email', {
      p_email: inspector_email,
    });

    if (!ownerId) {
      return fail(
        'email_not_verified',
        403,
        `Nu există un cont confirmat pentru ${inspector_email}. Inspectorul trebuie să se autentifice o dată pe uitdeITP (Google sau link magic) înainte de provisionare.`
      );
    }

    // --- Stația: creare sau join pe rar_code -------------------------------
    const { data: known } = await supabase
      .from('kiosk_stations')
      .select('id, rar_code, name')
      .eq('rar_code', rar_code)
      .maybeSingle();

    let stationId: string;
    let stationName: string;
    let stationCreated = false;

    if (known) {
      // Numele existent câștigă întotdeauna — redenumirea dintr-un ecran de
      // claim ar fi o gaură de integritate (regula lor D.8, pe care o aplicăm
      // și noi).
      stationId = known.id;
      stationName = known.name;
    } else {
      const { data: created, error: createError } = await supabase
        .from('kiosk_stations')
        .insert({
          name,
          slug: slugFrom(name, rar_code),
          rar_code,
          is_active: true,
          ingest_enabled: true,
          hmac_mode: 'log',
        } as never)
        .select('id, rar_code, name')
        .single();

      if (createError || !created) {
        console.error('[Provision] station insert failed:', createError);
        return fail('station_create_failed', 500, 'Nu am putut crea stația');
      }

      stationId = created.id;
      stationName = created.name;
      stationCreated = true;
    }

    // --- Apartenența -------------------------------------------------------
    // Emailul e deja verificat ca fiind al unui cont confirmat (mai sus).
    await supabase.from('station_members').upsert(
      {
        station_id: stationId,
        user_id: ownerId as string,
        role: 'patron',
        status: 'active',
        left_at: null,
      } as never,
      { onConflict: 'station_id,user_id' }
    );

    // owner_id se scrie doar dacă stația nu are deja unul: proprietarul legal
    // nu se schimbă dintr-un claim.
    await supabase
      .from('kiosk_stations')
      .update({ owner_id: ownerId as string, owner_email: inspector_email.toLowerCase() })
      .eq('id', stationId)
      .is('owner_id', null);

    // --- Cheia de ingest ---------------------------------------------------
    const generated = generateIngestKey();

    const { data: hmacSecretId, error: vaultError } = await supabase.rpc('secret_put', {
      p_name: `ingest_hmac_${stationId}_${Date.now()}`,
      p_secret: generated.hmacSecret,
    });

    if (vaultError || !hmacSecretId) {
      console.error('[Provision] Vault secret_put failed:', vaultError);
      return fail('vault_unavailable', 500, 'Nu am putut stoca secretul HMAC');
    }

    const { data: keyRow, error: keyError } = await supabase
      .from('station_api_keys')
      .insert({
        station_id: stationId,
        label: `Academy claim (${tier})`,
        key_prefix: generated.prefix,
        key_hash: generated.hash,
        hmac_secret_id: hmacSecretId as string,
      } as never)
      .select('id')
      .single();

    if (keyError || !keyRow) {
      console.error('[Provision] key insert failed:', keyError);
      return fail('key_create_failed', 500, 'Nu am putut emite cheia de ingest');
    }

    // --- Bundle-ul, pentru reluare ----------------------------------------
    const bundle = JSON.stringify({
      key: generated.raw,
      hmac_secret: generated.hmacSecret,
      key_id: keyRow.id,
    });

    const expiresAt = new Date(Date.now() + BUNDLE_TTL_HOURS * 3600_000).toISOString();

    const { data: bundleSecretId } = await supabase.rpc('secret_put', {
      p_name: `provision_bundle_${idempotencyKey}_${Date.now()}`,
      p_secret: bundle,
    });

    await supabase.from('partner_provision_requests').upsert(
      {
        idempotency_key: idempotencyKey,
        partner_key_id: partner.id,
        station_id: stationId,
        rar_code,
        station_api_key_id: keyRow.id,
        bundle_secret_id: (bundleSecretId as string) ?? null,
        bundle_expires_at: expiresAt,
        station_created: stationCreated,
      } as never,
      { onConflict: 'idempotency_key' }
    );

    console.log(
      `[Provision] station=${rar_code} created=${stationCreated} rotate=${rotate} partner=${partner.label}`
    );

    return withNoStore(
      NextResponse.json(
        {
          success: true,
          data: {
            station: {
              id: stationId,
              rar_code,
              name: stationName,
              created: stationCreated,
            },
            ingest: {
              key: generated.raw,
              hmac_secret: generated.hmacSecret,
              key_id: keyRow.id,
              endpoint: `${appUrl()}/api/integrations/reminders`,
            },
            dashboard_url: `${appUrl()}/stations/dashboard`,
            bundle_expires_at: expiresAt,
          },
        },
        { status: stationCreated ? 201 : 200 }
      )
    );
  } catch (error) {
    console.error('[Provision] unexpected error:', error);
    return fail('internal_error', 500, 'Eroare internă');
  }
}

function withNoStore(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
