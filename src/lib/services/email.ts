/**
 * Email Service - Resend Integration
 *
 * Handles sending email notifications via Resend API
 * Ported from Supabase Edge Function for code unification
 */

interface SendEmailParams {
  to: string;
  plate: string;
  expiryDate: string;
  daysUntilExpiry: number;
  type: 'ITP' | 'RCA' | 'Rovinieta';
  reminderId: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send reminder email notification
 */
export async function sendReminderEmail(
  params: SendEmailParams
): Promise<EmailResult> {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'notificari@uitdeitp.ro';

    if (!resendApiKey) {
      console.error('[Email] RESEND_API_KEY not configured');
      return { success: false, error: 'Email service not configured' };
    }

    // Build email subject
    const subject = `Reminder: ${params.type} pentru ${params.plate} expira în ${params.daysUntilExpiry} zile`;

    // Build email HTML
    const isUrgent = params.daysUntilExpiry <= 3;
    const html = buildEmailHTML(params, isUrgent);

    // Send via Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: params.to,
        subject,
        html,
        tags: [
          { name: 'type', value: params.type },
          { name: 'reminder_id', value: params.reminderId },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Email] Resend error:', errorData);
      return {
        success: false,
        error: errorData.message || 'Failed to send email',
      };
    }

    const data = await response.json();
    console.log(`[Email] Sent successfully: ${data.id}`);

    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    console.error('[Email] Sending error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Build HTML email template
 */
function buildEmailHTML(params: SendEmailParams, isUrgent: boolean): string {
  const typeColor =
    params.type === 'ITP' ? '#3B82F6' :
    params.type === 'RCA' ? '#10B981' :
    '#8B5CF6';

  const typeLabel =
    params.type === 'ITP' ? 'inspecția tehnică periodică (ITP)' :
    params.type === 'RCA' ? 'asigurarea RCA' :
    'taxa de drum (Rovinieta)';

  const actionLabel =
    params.type === 'ITP' ? 'inspectia' :
    params.type === 'RCA' ? 'asigurarea' :
    'taxa';

  const expiryText = params.daysUntilExpiry === 1 ? 'MÂINE' : `în ${params.daysUntilExpiry} zile`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; background-color: #f6f9fc; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
    <!-- Header -->
    <div style="background-color: ${typeColor}; padding: 32px 20px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="color: #ffffff; font-size: 32px; margin: 0;">uitdeITP.ro</h1>
      <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0 0 0;">Reminder ${params.type}</p>
    </div>

    ${isUrgent ? `
    <!-- Urgent Alert -->
    <div style="background-color: #FEE2E2; border: 2px solid #DC2626; border-radius: 8px; padding: 16px; margin: 32px 40px 24px;">
      <p style="color: #991B1B; font-size: 16px; font-weight: bold; margin: 0; text-align: center;">⚠️ ATENȚIE: Expirare iminentă!</p>
    </div>
    ` : ''}

    <!-- Content -->
    <div style="padding: 0 40px;">
      <h2 style="color: #1e293b; font-size: 24px; margin: 32px 0 24px;">
        ${params.type} pentru ${params.plate} expiră ${expiryText}
      </h2>

      <p style="color: #475569; font-size: 16px; line-height: 24px;">Bună ziua,</p>

      <p style="color: #475569; font-size: 16px; line-height: 24px;">
        Aceasta este o notificare automată că ${typeLabel}
        pentru vehiculul cu numărul <strong>${params.plate}</strong> va expira pe data de
        <strong>${new Date(params.expiryDate).toLocaleDateString('ro-RO')}</strong>.
      </p>

      ${isUrgent ? `
      <p style="color: #DC2626; font-size: 16px; line-height: 24px; font-weight: bold;">
        Vă recomandăm să programați ${actionLabel} cât mai curând posibil pentru a evita penalitățile.
      </p>
      ` : ''}

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://uitdeitp.ro/dashboard" style="background-color: ${typeColor}; color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
          Vizualizează Detalii
        </a>
      </div>
    </div>

    <!-- Divider -->
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">

    <!-- Footer -->
    <div style="padding: 0 40px; text-align: center;">
      <p style="color: #94a3b8; font-size: 12px; line-height: 18px;">
        Acest email a fost trimis automat de platforma <strong>uitdeITP.ro</strong>
      </p>
      <p style="color: #94a3b8; font-size: 12px; line-height: 18px;">
        Nu dorești să primești aceste notificări? <a href="https://uitdeitp.ro/unsubscribe" style="color: #3B82F6;">Dezabonare</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
