/**
 * Alertele NotifyHub — Contract D, ultima piesă.
 *
 * DLR-urile curgeau deja; alertele mureau în logurile lor fiindcă
 * `ALERT_WEBHOOK_URL` n-avea destinație. Am ales varianta (a) din cererea lor:
 * **același endpoint** ca DLR-ul, cu dispatch pe `X-NotifyHub-Event`.
 *
 * Motivul e că alternativa nu cumpăra nimic: semnătura, secretul, verificarea
 * de vechime a marcajului de timp și logica de reîncercare sunt identice. Un al
 * doilea endpoint ar fi însemnat același cod scris de două ori, cu șansa ca
 * peste șase luni doar unul dintre ele să primească o corecție de securitate.
 *
 * Ce facem cu fiecare tip: `low_balance` merge și la patronul stației, fiindcă
 * el e singurul care poate face ceva — restul sunt probleme de platformă și
 * rămân la noi. Nimic nu aruncă: o alertă pierdută e neplăcută, dar un 500 le
 * pune în outbox o reîncercare care se va lovi de aceeași eroare de opt ori.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { sendOpsAlert } from '@/lib/services/ops-alert';

export interface NotifyHubAlert {
  type?: string;
  severity?: string;
  ownerRef?: string;
  message?: string;
  data?: Record<string, unknown>;
}

/** Alertele care privesc o stație, nu platforma. */
const STATION_FACING = new Set(['low_balance', 'negative_balance_P1']);

/**
 * `owner_ref` e codul RAR al stației pentru cheile emise de noi
 * (`provisionStationNotifyHubKey` îl trimite ca atare), și `platform:*` pentru
 * cheile de infrastructură. Doar primul caz are un patron de anunțat.
 */
async function stationContactFor(ownerRef: string | undefined): Promise<{
  name: string | null;
  email: string | null;
}> {
  if (!ownerRef || ownerRef.startsWith('platform:') || ownerRef.startsWith('test:')) {
    return { name: null, email: null };
  }

  try {
    const { data } = await createAdminClient()
      .from('kiosk_stations')
      .select('name, owner_email')
      .eq('rar_code', ownerRef)
      .maybeSingle();

    return {
      name: (data as { name?: string } | null)?.name ?? null,
      email: (data as { owner_email?: string } | null)?.owner_email ?? null,
    };
  } catch (error) {
    console.warn('[NotifyHub alert] nu am putut rezolva stația', { ownerRef, error });
    return { name: null, email: null };
  }
}

export async function handleNotifyHubAlert(alert: NotifyHubAlert): Promise<{
  handled: boolean;
  notifiedStation: boolean;
}> {
  const type = alert.type ?? 'unknown';
  const severity = alert.severity ?? 'info';

  // Jurnalul rămâne chiar dacă emailul cade: e singura urmă dacă Resend e jos.
  console.warn('[NotifyHub alert]', {
    type,
    severity,
    ownerRef: alert.ownerRef,
    message: alert.message,
    data: alert.data,
  });

  const station = STATION_FACING.has(type)
    ? await stationContactFor(alert.ownerRef)
    : { name: null, email: null };

  const lines = [
    `Tip: ${type}`,
    `Severitate: ${severity}`,
    alert.ownerRef ? `Cheie / stație: ${alert.ownerRef}` : null,
    station.name ? `Stație: ${station.name}` : null,
    alert.message ? `Mesaj: ${alert.message}` : null,
    alert.data && Object.keys(alert.data).length > 0
      ? `Detalii: ${JSON.stringify(alert.data)}`
      : null,
  ].filter((line): line is string => Boolean(line));

  const sent = await sendOpsAlert({
    subject: `[NotifyHub] ${type}${station.name ? ` — ${station.name}` : ''}`,
    lines,
    extraRecipients: [station.email],
  });

  return { handled: sent, notifiedStation: Boolean(station.email) };
}
