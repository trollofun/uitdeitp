/**
 * POST /api/partner/stations/events — ciclul de viață al stației, după claim.
 *
 * Contract F rezolvă nașterea. Restul vieții nu era acoperit de nimic: o stație
 * deconectată în Academy continua să scrie la noi cu o cheie pe care ei o
 * credeau revocată, iar inspectorii unei stații n-aveau cum să primească acces
 * — rolul `inspector` există în `station_members`, dar nimic nu scria vreodată
 * un rând cu el.
 *
 * Un endpoint, nu patru: Academy poate adăuga un tip nou fără să ceară o rută
 * nouă, iar idempotența, auditul și retry-ul au un singur loc.
 *
 * **Un tip necunoscut primește `202 {handled: false}`, nu `400`.** Nu vrem să le
 * rupem coada de evenimente fiindcă noi n-am prins din urmă cu un tip nou.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticatePartner, touchPartnerKey, PartnerAuthError } from '@/lib/partner/keys';
import { syncStationRole } from '@/lib/auth/sync-station-role';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
// Scrie în bază prin supabase-js: fără asta, Data Cache-ul poate servi un
// răspuns memorat și revocarea nu ajunge niciodată la Postgres. Vezi `/r`.
export const fetchCache = 'force-no-store';

const eventSchema = z.object({
  type: z.string().min(1).max(64),
  academy_station_id: z.string().min(1).max(128).optional(),
  rar_code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{1,2}[0-9]{2,4}$/, 'Cod RAR invalid (ex. CT123)')
    .optional(),
  occurred_at: z.string().datetime().optional(),
  data: z.record(z.unknown()).default({}),
});

function fail(code: string, status: number, message: string) {
  return NextResponse.json({ success: false, error: message, code }, { status });
}

type Supabase = ReturnType<typeof createServiceClient>;

/**
 * Găsește stația. `academy_station_id` are prioritate: e stabil, spre deosebire
 * de `rar_code`, care e tocmai lucrul care se poate schimba — iar un eveniment
 * de tip `rar_code.changed` sosit după schimbare n-ar mai găsi nimic dacă am
 * căuta doar după cod.
 */
type StationRow = {
  id: string;
  name: string;
  /** Nenul ⇔ ingestul a fost oprit de un eveniment de-al lor, nu de noi. */
  deactivated_at: string | null;
  ingest_enabled: boolean | null;
};

const STATION_COLUMNS = 'id, name, deactivated_at, ingest_enabled';

async function findStation(
  supabase: Supabase,
  academyId?: string,
  rarCode?: string
): Promise<StationRow | null> {
  if (academyId) {
    const { data } = await supabase
      .from('kiosk_stations')
      .select(STATION_COLUMNS)
      .eq('academy_station_id', academyId)
      .maybeSingle();
    if (data) return data as StationRow;
  }

  if (rarCode) {
    const { data } = await supabase
      .from('kiosk_stations')
      .select(STATION_COLUMNS)
      .eq('rar_code', rarCode)
      .maybeSingle();
    if (data) return data as StationRow;
  }

  return null;
}

/** Revocă toate cheile de ingest vii ale stației. Idempotent prin construcție. */
async function revokeIngestKeys(supabase: Supabase, stationId: string): Promise<number> {
  const { data } = await supabase
    .from('station_api_keys')
    .update({ revoked_at: new Date().toISOString() } as never)
    .eq('station_id', stationId)
    .is('revoked_at', null)
    .select('id');

  return data?.length ?? 0;
}

/**
 * Atașează sau scoate un membru, pe email.
 *
 * Aceeași regulă nenegociabilă ca la provisionare: **doar pe cont confirmat**.
 * Fără ea, cine tastează adresa unui inspector îi primește accesul la stație.
 */
async function resolveMember(
  supabase: Supabase,
  email: unknown
): Promise<{ userId: string } | { error: string }> {
  if (typeof email !== 'string' || !email.includes('@')) {
    return { error: 'Câmpul `data.email` lipsește sau nu e un email' };
  }

  const { data: userId } = await supabase.rpc('find_user_id_by_email', {
    p_email: email.toLowerCase(),
  });

  if (!userId) {
    return {
      error: `Nu există un cont confirmat pentru ${email}. Inspectorul trebuie să se autentifice o dată pe uitdeITP înainte.`,
    };
  }

  return { userId: userId as string };
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient();

  let partner;
  try {
    partner = await authenticatePartner(req.headers.get('authorization'), 'stations:lifecycle');
  } catch (error) {
    if (error instanceof PartnerAuthError) {
      return fail(error.code, error.statusCode, error.message);
    }
    return fail('internal_error', 500, 'Eroare la autentificare');
  }

  // Fire-and-forget, ca la provisionare. E și singura dovadă ieftină că
  // scope-ul `stations:lifecycle` a devenit activ pe cheia lor: `last_used_at`
  // se mișcă la prima cerere care trece de autentificare, inclusiv la o probă
  // cu un tip necunoscut, care nu atinge nicio stație.
  touchPartnerKey(partner.id);

  const idempotencyKey = req.headers.get('idempotency-key')?.trim();
  if (!idempotencyKey) {
    return fail('missing_idempotency_key', 422, 'Antetul `Idempotency-Key` e obligatoriu');
  }

  // Reluarea după timeout întoarce ce s-a decis prima dată, nu re-execută.
  const { data: seen } = await supabase
    .from('partner_station_events')
    .select('event_type, handled, result')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (seen) {
    return NextResponse.json(
      { success: true, accepted: true, handled: seen.handled, result: seen.result, replayed: true },
      { status: 200 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('invalid_payload', 400, 'Corp JSON invalid');
  }

  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return fail('invalid_payload', 400, parsed.error.errors[0]?.message ?? 'Corp invalid');
  }

  const { type, academy_station_id, rar_code, occurred_at, data } = parsed.data;
  const station = await findStation(supabase, academy_station_id, rar_code);

  let handled = false;
  let result: Record<string, unknown> = {};

  // Un eveniment fără stație cunoscută nu e o eroare a lor: poate fi o stație
  // pe care n-am provisionat-o încă. Îl logăm și spunem că n-am tratat nimic.
  if (!station) {
    result = { reason: 'station_not_found' };
  } else {
    switch (type) {
      case 'installation.deactivated': {
        const revoked = await revokeIngestKeys(supabase, station.id);
        await supabase
          .from('kiosk_stations')
          .update({
            deactivated_at: new Date().toISOString(),
            deactivated_reason: typeof data.reason === 'string' ? data.reason : null,
            // **Doar ingestul.** Prima versiune punea și `is_active: false`,
            // ceea ce ar fi omorât și kiosk-ul — greșit, și greșit exact în
            // dauna unui client care plătește.
            //
            // Academy emite evenimentul când „ultima cheie utilizabilă a
            // dispărut", adică despre licența SIRAR. Kiosk-ul e produsul nostru,
            // vândut separat: o stație poate renunța la Automatizare și rămâne
            // client uitdeITP. Ce depinde de instalarea SIRAR e Contract A, deci
            // doar aia se oprește.
            ingest_enabled: false,
          } as never)
          .eq('id', station.id);

        handled = true;
        result = { revoked_keys: revoked };
        break;
      }

      case 'installation.reactivated': {
        // Repornim ingestul DOAR dacă tot un eveniment de-al lor l-a oprit —
        // adică `deactivated_at` e setat. Altfel, `ingest_enabled: false` e o
        // decizie a noastră (neplată, abuz, cerere a stației) și un eveniment
        // despre licența SIRAR n-are voie s-o anuleze.
        //
        // Nu e teoretic: runda de sincronizare de la pornire emite starea
        // **curentă** a fiecărei stații, deci trimite `reactivated` pentru tot
        // ce e viu la ei. Fără garda asta, o fotografie menită să ne alinieze
        // ar reporni tăcut ingestul pe orice stație oprită manual de noi.
        const ours = station.deactivated_at !== null;

        await supabase
          .from('kiosk_stations')
          .update({
            deactivated_at: null,
            deactivated_reason: null,
            // Simetric cu dezactivarea: n-am oprit `is_active`, deci nu-l
            // repornim. O stație dezactivată manual din admin nu are voie să
            // reînvie dintr-un eveniment despre licența SIRAR.
            ...(ours ? { ingest_enabled: true } : {}),
          } as never)
          .eq('id', station.id);

        // Nu emitem cheie aici. Cheile ies dintr-un singur loc — endpoint-ul de
        // provisionare, cu `rotate: true` — ca să nu existe două căi prin care
        // pot apărea credențiale în ecosistem.
        handled = true;
        result = ours
          ? { ingest_reenabled: true, note: 'Reactivată. Cere o cheie nouă prin /provision cu rotate: true.' }
          : {
              ingest_reenabled: false,
              note: 'Marcată reactivată, dar ingestul rămâne oprit: nu noi îl oprisem printr-un eveniment de-al vostru.',
            };
        break;
      }

      case 'member.added': {
        const member = await resolveMember(supabase, data.email);
        if ('error' in member) {
          result = { error: member.error };
          break;
        }

        const role = data.role === 'patron' ? 'patron' : 'inspector';

        await supabase.from('station_members').upsert(
          {
            station_id: station.id,
            user_id: member.userId,
            role,
            status: 'active',
            left_at: null,
          } as never,
          { onConflict: 'station_id,user_id' }
        );

        // Același motiv ca la provisionare: fără rolul de platformă, membrul
        // nou e trimis la `/stations` și respins de middleware.
        await syncStationRole(supabase, member.userId, role);

        handled = true;
        result = { role };
        break;
      }

      case 'member.removed': {
        const member = await resolveMember(supabase, data.email);
        if ('error' in member) {
          result = { error: member.error };
          break;
        }

        // Nu ștergem rândul: rămâne urma că omul a lucrat aici, iar accesul
        // cade oricum imediat — `resolveMyStationAccess` cere `status: 'active'`.
        await supabase
          .from('station_members')
          .update({ status: 'left', left_at: new Date().toISOString() } as never)
          .eq('station_id', station.id)
          .eq('user_id', member.userId);

        handled = true;
        break;
      }

      case 'tier.changed': {
        const tier = data.tier === 'auto' ? 'auto' : 'lite';
        await supabase.from('kiosk_stations').update({ tier } as never).eq('id', station.id);
        handled = true;
        result = { tier };
        break;
      }

      case 'rar_code.changed': {
        const next = typeof data.new === 'string' ? data.new.toUpperCase() : null;
        if (!next || !/^[A-Z]{1,2}[0-9]{2,4}$/.test(next)) {
          result = { error: 'Câmpul `data.new` lipsește sau nu e un cod RAR valid' };
          break;
        }

        await supabase.from('kiosk_stations').update({ rar_code: next } as never).eq('id', station.id);
        handled = true;
        result = { rar_code: next };
        break;
      }

      case 'station.renamed': {
        // Deliberat netratat. Regula comună e că numele existent câștigă —
        // redenumirea dintr-un ecran de claim ar fi o gaură de integritate.
        // Logăm ca să se vadă în admin, dar nu aplicăm.
        result = { note: 'Înregistrat, neaplicat: numele existent câștigă (regula D.8).' };
        break;
      }

      default:
        result = { reason: 'unknown_event_type' };
    }
  }

  await supabase.from('partner_station_events').insert({
    idempotency_key: idempotencyKey,
    partner_key_id: partner.id,
    event_type: type,
    academy_station_id: academy_station_id ?? null,
    rar_code: rar_code ?? null,
    station_id: station?.id ?? null,
    payload: data as never,
    handled,
    result: result as never,
    occurred_at: occurred_at ?? null,
  } as never);

  return NextResponse.json({ success: true, accepted: true, handled, result }, { status: 202 });
}
