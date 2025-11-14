/**
 * NotifyHub Client for uitdeitp-app
 * Handles SMS verification and notification sending via NotifyHub gateway
 *
 * Features:
 * - Exponential backoff retry (3 attempts)
 * - Automatic failover between providers
 * - Network error handling
 */

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface SendSmsRequest {
  to: string;
  message: string;
  templateId?: string;
  data?: Record<string, any>;
}

interface SendSmsResponse {
  success: boolean;
  messageId?: string;
  provider?: string;
  parts?: number;
  cost?: number;
  error?: string;
  code?: string;
}

class NotifyHubClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.NOTIFYHUB_URL || 'https://ntf.uitdeitp.ro';
    this.apiKey = process.env.NOTIFYHUB_API_KEY || '';

    if (!this.apiKey) {
      console.warn('[NotifyHub] API key not configured');
    }
  }

  /**
   * Send SMS via NotifyHub with automatic failover and retry logic
   *
   * Retry Strategy:
   * - 3 attempts with exponential backoff
   * - Initial delay: 1s, then 2s, then 4s
   * - Total max time: 7 seconds
   * - Retries on: NETWORK_ERROR, HTTP 5xx, timeout
   * - No retry on: 4xx errors (bad request, auth failure)
   */
  async sendSms(request: SendSmsRequest): Promise<SendSmsResponse> {
    const maxRetries = 3;
    let lastError: SendSmsResponse | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/api/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(5000), // 5s timeout per attempt
        });

        const data = await response.json();

        if (!response.ok) {
          const errorResponse = {
            success: false,
            error: data.error || 'SMS sending failed',
            code: data.code || 'UNKNOWN_ERROR',
          };

          // Don't retry on 4xx errors (client errors, auth failures)
          if (response.status >= 400 && response.status < 500) {
            console.error(`[NotifyHub] Client error (no retry): ${response.status}`, errorResponse);
            return errorResponse;
          }

          // Retry on 5xx errors (server errors)
          lastError = errorResponse;
          console.warn(`[NotifyHub] Attempt ${attempt}/${maxRetries} failed: ${response.status}`, errorResponse);

          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
            console.log(`[NotifyHub] Retrying in ${delay}ms...`);
            await sleep(delay);
            continue;
          }

          return errorResponse;
        }

        // Success!
        if (attempt > 1) {
          console.log(`[NotifyHub] ✅ Success on attempt ${attempt}/${maxRetries}`);
        }
        return data;

      } catch (error) {
        const errorResponse: SendSmsResponse = {
          success: false,
          error: error instanceof Error ? error.message : 'Network error',
          code: 'NETWORK_ERROR',
        };

        lastError = errorResponse;
        console.error(`[NotifyHub] Attempt ${attempt}/${maxRetries} network error:`, error);

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          console.log(`[NotifyHub] Retrying in ${delay}ms...`);
          await sleep(delay);
          continue;
        }

        return errorResponse;
      }
    }

    // Should never reach here, but TypeScript requires a return
    return lastError || {
      success: false,
      error: 'All retry attempts failed',
      code: 'MAX_RETRIES_EXCEEDED',
    };
  }

  /**
   * Send verification code SMS
   */
  async sendVerificationCode(
    phone: string,
    code: string,
    stationName: string = 'uitdeitp.ro'
  ): Promise<SendSmsResponse> {
    const message = `Codul tau ${stationName}: ${code}\nIntrodu pe tableta pentru reminder ITP.\nNu ai cerut? Ignora.`;

    return this.sendSms({
      to: phone,
      message,
      templateId: 'verification_code',
      data: {
        code,
        stationName,
      },
    });
  }

  /**
   * Send ITP reminder notification
   */
  async sendItpReminder(
    phone: string,
    name: string,
    plate: string,
    expiryDate: string,
    daysUntil: number
  ): Promise<SendSmsResponse> {
    let templateId = 'itp_7d';
    let message = '';

    if (daysUntil < 0) {
      templateId = 'itp_expired';
      message = `ATENȚIE: ${name}, ITP pentru ${plate} a EXPIRAT la data de ${expiryDate}. Programează urgent verificare!`;
    } else if (daysUntil <= 1) {
      templateId = 'itp_1d';
      message = `URGENT: ${name}, ITP pentru ${plate} expiră MÂINE (${expiryDate})! Programează astăzi!`;
    } else if (daysUntil <= 3) {
      templateId = 'itp_3d';
      message = `Reminder: ${name}, ITP pentru ${plate} expiră în ${daysUntil} zile (${expiryDate})! Programează urgent!`;
    } else {
      templateId = 'itp_7d';
      message = `Bună ${name}! ITP pentru ${plate} expiră în ${daysUntil} zile (${expiryDate}). Nu uita să programezi o verificare tehnică!`;
    }

    return this.sendSms({
      to: phone,
      message,
      templateId,
      data: {
        name,
        plate,
        date: expiryDate,
        daysUntil,
      },
    });
  }

  /**
   * Check NotifyHub health
   */
  async checkHealth(): Promise<{ ok: boolean; status?: any; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        return { ok: false, error: `HTTP ${response.status}` };
      }

      const data = await response.json();
      return { ok: true, status: data };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Singleton instance
export const notifyHub = new NotifyHubClient();

// Export types
export type { SendSmsRequest, SendSmsResponse };
