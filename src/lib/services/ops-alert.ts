/**
 * Plain operational alerts to a human (F0.7: "plafon zilnic de OTP per stație
 * cu alertă și oprire automată").
 *
 * Deliberately a raw fetch rather than src/lib/email/resend.ts: that module
 * takes a React element and is built for customer-facing reminder templates.
 * An alert is three lines of text and must not depend on a renderer.
 *
 * Never throws. An alert that fails must not take down the request that
 * triggered it — the auto-stop itself is the protection, the mail is only how
 * we hear about it.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

function opsRecipients(): string[] {
  const raw = process.env.OPS_ALERT_EMAIL || process.env.ADMIN_ALERT_EMAIL;
  return raw
    ? raw.split(',').map((address) => address.trim()).filter(Boolean)
    : [];
}

export async function sendOpsAlert({
  subject,
  lines,
  extraRecipients = [],
}: {
  subject: string;
  lines: string[];
  /** e.g. the station owner, on top of the ops mailbox */
  extraRecipients?: Array<string | null | undefined>;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = Array.from(
    new Set([...opsRecipients(), ...extraRecipients.filter((x): x is string => Boolean(x))])
  );

  if (!apiKey || to.length === 0) {
    // Still leave a trace: on Vercel this is the only signal left.
    console.warn('[OPS-ALERT] not delivered (no key or no recipient)', { subject, lines });
    return false;
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'notificari@uitdeitp.ro',
        to,
        subject,
        text: lines.join('\n'),
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.warn('[OPS-ALERT] Resend rejected the alert', {
        subject,
        status: response.status,
      });
      return false;
    }

    return true;
  } catch (error) {
    console.warn('[OPS-ALERT] send failed', {
      subject,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
