/**
 * Post-inspection review request pass (F2.5).
 *
 * Runs after the reminder pass, in its own try/catch: a failure here must never
 * affect ITP reminders.
 *
 * Gates, ALL of which must pass before a single message goes out:
 *   1. REVIEW_SMS_ENABLED (global; OFF until the consent wording is cleared)
 *   2. the station opted in AND has a review link
 *   3. the client's consent_version is one of the approved versions
 *   4. no global opt-out and no per-reminder opt-out
 *   5. no review_requests row for that reminder yet (unique constraint)
 */

import { createClient } from '@supabase/supabase-js';
import { flags } from '@/lib/config/flags';
import { sendSms } from '@/lib/services/notification';
import { valueNormalizerFor } from '@/lib/services/sms-encoding';
import { shortPath } from '@/lib/config/short-url';
import { logSms } from '@/lib/services/notification-log';
import { getStationSendKey } from '@/lib/services/station-credits';
import { CANONICAL_CONSENT_VERSIONS } from '@/lib/integrations/contract-a';

/** The cron shares a 60s budget with the reminder pass. */
const MAX_REVIEW_SENDS_PER_RUN = 50;

/**
 * Câte luni trebuie să treacă între două cereri de recenzie către același număr.
 *
 * Șase, pentru că ITP-ul se face anual sau la doi ani: un client normal n-ar
 * trebui să primească mai mult de o cerere pe an. Fereastra mai scurtă îl apără
 * pe cel cu mai multe mașini de a fi întrebat de trei ori într-o săptămână,
 * fără să blocheze cererea legitimă de la inspecția următoare.
 */
const REVIEW_MIN_MONTHS_BETWEEN_REQUESTS = 6;

export interface ReviewPassResult {
  skipped?: string;
  considered: number;
  sent: number;
  failed: number;
  skippedCount: number;
}

export async function processReviewRequestsForToday(): Promise<ReviewPassResult> {
  const empty: ReviewPassResult = { considered: 0, sent: 0, failed: 0, skippedCount: 0 };

  if (!flags.reviewSmsEnabled) {
    return { ...empty, skipped: 'globally_disabled' };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: stations, error: stationsError } = await supabase
    .from('kiosk_stations')
    .select(
      'id, name, review_link, review_delay_days, sms_template_review, use_own_notifyhub_key, notifyhub_key_secret_id'
    )
    .eq('review_sms_enabled', true)
    .eq('is_active', true)
    .not('review_link', 'is', null);

  if (stationsError || !stations || stations.length === 0) {
    return { ...empty, skipped: 'no_station_opted_in' };
  }

  const result = { ...empty };

  for (const station of stations) {
    const delay = station.review_delay_days ?? 3;
    const target = new Date();
    target.setDate(target.getDate() - delay);
    const targetDate = target.toISOString().split('T')[0];

    const { data: candidates } = await supabase
      .from('reminders')
      .select(
        'id, guest_phone, guest_name, plate_number, consent_version, opt_out, inspection_result'
      )
      .eq('station_id', station.id)
      .eq('source', 'import')
      .eq('inspected_at', targetDate)
      .is('deleted_at', null)
      .limit(MAX_REVIEW_SENDS_PER_RUN);

    for (const reminder of candidates ?? []) {
      result.considered += 1;

      if (result.sent + result.failed >= MAX_REVIEW_SENDS_PER_RUN) break;

      const skip = async (reason: string) => {
        result.skippedCount += 1;
        await supabase.from('review_requests').insert({
          reminder_id: reminder.id,
          station_id: station.id,
          phone: reminder.guest_phone ?? '',
          scheduled_for: targetDate,
          status: 'skipped',
          skip_reason: reason,
          consent_version: reminder.consent_version,
        } as never);
      };

      if (!reminder.guest_phone) {
        await skip('no_phone');
        continue;
      }

      if (reminder.opt_out) {
        await skip('opt_out');
        continue;
      }

      if (
        !reminder.consent_version ||
        !CANONICAL_CONSENT_VERSIONS.includes(
          reminder.consent_version as (typeof CANONICAL_CONSENT_VERSIONS)[number]
        )
      ) {
        await skip('consent_version_not_approved');
        continue;
      }

      const { data: optOut } = await supabase
        .from('global_opt_outs')
        .select('phone')
        .eq('phone', reminder.guest_phone)
        .is('deleted_at', null)
        .maybeSingle();

      if (optOut) {
        await skip('global_opt_out');
        continue;
      }

      // Poarta pe rezultat. Azi filtrul e la sursă — SIRAR trimite doar
      // inspecțiile trecute, din ITP Pro și din ITP Pro Auto deopotrivă, deci
      // `inspection_result` e NULL peste tot și poarta nu schimbă nimic.
      //
      // Dar SIRAR a cerut să putem primi și respingerile. În ziua în care le
      // primim, asta e singura oprire între un om căruia tocmai i-am respins
      // mașina și un SMS care îi mulțumește și îi cere o recenzie. Costă o linie
      // acum; mai târziu ar costa o reputație.
      if (reminder.inspection_result === 'rejected') {
        await skip('inspection_rejected');
        continue;
      }

      // Anti-spam dincolo de `unique(reminder_id)`: constrângerea aceea apără
      // împotriva a două mesaje pentru *aceeași* inspecție. Nu apără clientul
      // care aduce trei mașini în aceeași lună, sau care revine la 6 luni cu
      // aceeași mașină după o remediere — pentru el sunt inspecții diferite,
      // deci rânduri diferite, deci constrângerea tace.
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - REVIEW_MIN_MONTHS_BETWEEN_REQUESTS);

      const { data: recent } = await supabase
        .from('review_requests')
        .select('id')
        .eq('phone', reminder.guest_phone)
        .eq('status', 'sent')
        .gte('sent_at', cutoff.toISOString())
        .limit(1)
        .maybeSingle();

      if (recent) {
        await skip('recent_request');
        continue;
      }

      // Claim the slot first: the unique constraint on reminder_id is what
      // guarantees one message per client per inspection even on a retry.
      //
      // Revendicarea se face acum **înaintea** randării, nu după: tokenul
      // linkului scurt se naște la insert, iar mesajul are nevoie de el.
      const { data: claimed, error: claimError } = await supabase
        .from('review_requests')
        .insert({
          reminder_id: reminder.id,
          station_id: station.id,
          phone: reminder.guest_phone,
          scheduled_for: targetDate,
          status: 'scheduled',
          consent_version: reminder.consent_version,
        } as never)
        .select('id, token')
        .single();

      if (claimError || !claimed) {
        // 23505 = already handled in a previous run
        if (claimError?.code !== '23505') {
          console.warn('[Review] could not claim slot', { id: reminder.id, code: claimError?.code });
        }
        continue;
      }

      // Aceeași regulă ca la reminderele obișnuite: dacă șablonul stației e
      // curat, nu-l stricăm cu diacritice venite din numele clientului sau al
      // stației — un singur „ș" ar dubla costul fiecărui SMS de recenzie.
      const template = station.sms_template_review ?? '';
      const v = valueNormalizerFor(template);

      // `{review_link}` primește linkul **nostru**, nu pe cel al stației: altfel
      // n-am ști niciodată dacă cineva a dat clic, iar stația n-ar avea cum să
      // justifice costul. Redirectul către formularul Google se face în `/r`.
      const shortLink = shortPath(`/r?t=${encodeURIComponent((claimed as { token: string }).token)}`);

      const message = template
        .replace(/{station_name}/g, v(station.name))
        .replace(/{review_link}/g, shortLink)
        .replace(/{name}/g, v(reminder.guest_name ?? 'Client'))
        .replace(/{plate}/g, v(reminder.plate_number));

      const apiKey = await getStationSendKey(station);
      const sms = await sendSms(
        reminder.guest_phone,
        message,
        undefined,
        undefined,
        {
          ...(apiKey ? { apiKey } : {}),
          // `review_requests` are unique(reminder_id), deci id-ul cererii e
          // deja unic pe client și pe rundă — exact ce trebuie ca o reluare a
          // procesorului să nu ceară de două ori aceeași recenzie.
          idempotencyKey: `review:${(claimed as { id: string }).id}`,
        }
      );

      await logSms({
        reminderId: reminder.id,
        recipient: reminder.guest_phone,
        messageBody: message,
        result: sms,
        metadata: { kind: 'review_request', station_id: station.id },
      });

      await supabase
        .from('review_requests')
        .update({
          status: sms.success ? 'sent' : 'failed',
          sent_at: sms.success ? new Date().toISOString() : null,
          skip_reason: sms.success ? null : (sms.error ?? 'send_failed'),
        })
        .eq('reminder_id', reminder.id);

      if (sms.success) result.sent += 1;
      else result.failed += 1;
    }
  }

  return result;
}
