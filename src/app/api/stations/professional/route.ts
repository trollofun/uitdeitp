/**
 * POST /api/stations/professional — contul profesional al inspectorului
 * (decizia din 23.08: inspectorii își pot crește propria bază de clienți).
 *
 * Self-service: orice utilizator autentificat își creează mini-stația
 * personală (kind='professional') — clienții LUI, creditele LUI, șabloanele
 * lui. Fără cod RAR propriu, fără kiosk, fără listare publică.
 *
 * Fluxul flawless cerut de owner: cheia de ingest se emite AICI, la creare,
 * și se întoarce O SINGURĂ DATĂ — inspectorul o pune în agentul lui SIRAR și
 * clienții pe care îi introduce curg automat în contul lui. Verificarea
 * rar_code din ingest se sare natural (station.rar_code e NULL), iar rar-ul
 * din payload (stația angajatorului) rămâne doar informativ.
 *
 * Baza e gratuită: ingest + listă de clienți + email. Creditele plătesc doar SMS.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { flags } from '@/lib/config/flags';
import { generateIngestKey } from '@/lib/integrations/station-keys';
import { syncStationRole } from '@/lib/auth/sync-station-role';
import { roPhoneSchema } from '@/lib/validation';
import { appUrl } from '@/lib/config/app-url';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  name: z.string().min(3, 'Numele trebuie să aibă minim 3 caractere').max(80),
  phone: roPhoneSchema,
  // Operator de date pentru PROPRII clienți — atestare explicită, ca la import.
  gdpr_accepted: z.literal(true, {
    errorMap: () => ({
      message: 'Trebuie să confirmi că ești responsabil de datele clienților tăi (GDPR)',
    }),
  }),
});

function slugify(name: string): string {
  return (
    'pro-' +
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40)
  );
}

export async function POST(req: NextRequest) {
  try {
    if (!flags.professionalAccountsEnabled) {
      return NextResponse.json({ error: 'Indisponibil momentan' }, { status: 503 });
    }

    const supabase = createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Autentificare necesară' }, { status: 401 });
    }

    const body = createSchema.parse(await req.json());
    const service = createServiceClient();

    // Un singur cont profesional per om — al doilea e aproape sigur o
    // apăsare dublă, nu o a doua afacere.
    const { data: existing } = await service
      .from('kiosk_stations')
      .select('id, name')
      .eq('owner_id', user.id)
      .eq('kind' as never, 'professional')
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `Ai deja un cont profesional („${existing.name}")` },
        { status: 409 }
      );
    }

    // Slug unic: sufix numeric la coliziune.
    const base = slugify(body.name);
    let slug = base;
    for (let i = 2; i <= 20; i++) {
      const { data: taken } = await service
        .from('kiosk_stations')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (!taken) break;
      slug = `${base}-${i}`;
    }

    const { data: station, error: createError } = await service
      .from('kiosk_stations')
      .insert({
        name: body.name,
        slug,
        kind: 'professional',
        station_phone: body.phone,
        owner_id: user.id,
        owner_email: user.email?.toLowerCase() ?? null,
        is_active: true,
        ingest_enabled: true,
        hmac_mode: 'log',
        public_listed: false,
      } as never)
      .select('id, name, slug')
      .single();

    if (createError || !station) {
      console.error('[Professional] station insert failed:', createError);
      return NextResponse.json({ error: 'Nu am putut crea contul' }, { status: 500 });
    }

    await service.from('station_members').upsert(
      {
        station_id: station.id,
        user_id: user.id,
        role: 'patron',
        status: 'active',
        added_by: user.id,
      } as never,
      { onConflict: 'station_id,user_id' }
    );
    await syncStationRole(service, user.id, 'patron');

    // Cheia de ingest SIRAR — emisă acum, afișată o singură dată.
    const generated = generateIngestKey();
    let ingest: { key: string; hmac_secret: string; endpoint: string } | null = null;

    const { data: hmacSecretId, error: vaultError } = await service.rpc('secret_put', {
      p_name: `ingest_hmac_${station.id}_${Date.now()}`,
      p_secret: generated.hmacSecret,
    });

    if (!vaultError && hmacSecretId) {
      const { error: keyError } = await service.from('station_api_keys').insert({
        station_id: station.id,
        label: 'Cont profesional (SIRAR personal)',
        key_prefix: generated.prefix,
        key_hash: generated.hash,
        hmac_secret_id: hmacSecretId as string,
      } as never);

      if (!keyError) {
        ingest = {
          key: generated.raw,
          hmac_secret: generated.hmacSecret,
          endpoint: `${appUrl()}/api/integrations/reminders`,
        };
      } else {
        console.error('[Professional] ingest key insert failed:', keyError);
      }
    } else {
      console.error('[Professional] vault secret_put failed:', vaultError);
    }

    console.log('[Professional] account created', { userId: user.id, stationId: station.id });

    return NextResponse.json(
      {
        success: true,
        station: { id: station.id, name: station.name, slug: station.slug },
        // null = cheia n-a putut fi emisă acum; se poate emite ulterior din admin.
        ingest,
        dashboard_url: `${appUrl()}/stations/dashboard?station_id=${station.id}`,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? 'Date invalide' }, { status: 400 });
    }
    console.error('[Professional] error:', error);
    return NextResponse.json({ error: 'Eroare internă' }, { status: 500 });
  }
}
