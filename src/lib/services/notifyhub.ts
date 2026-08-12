/**
 * NotifyHub Client for uitdeitp-app
 * Handles SMS verification and notification sending via NotifyHub gateway
 *
 * Features:
 * - Exponential backoff retry (3 attempts)
 * - Automatic failover between providers
 * - Network error handling
 */

import { appUrl } from '@/lib/config/app-url';

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * URL-ul de callback atașat fiecărui send, sau null când nu are sens.
 *
 * Două gărzi, amândouă ca să nu stricăm trimiterea propriu-zisă:
 *  - fără NOTIFYHUB_CALLBACK_SECRET nu atașăm nimic — ruta noastră ar
 *    răspunde 503 la orice callback, deci am umple outbox-ul lor cu
 *    reîncercări condamnate;
 *  - NotifyHub validează callbackUrl cu Zod (https public, fără loopback)
 *    și respinge TOATĂ cererea la încălcare — un localhost din dev ar
 *    transforma fiecare SMS într-un 400.
 */
function dlrCallbackUrl(): string | null {
  if (!process.env.NOTIFYHUB_CALLBACK_SECRET?.trim()) return null;
  const base = appUrl();
  if (!base.startsWith('https://')) return null;
  return `${base}/api/webhooks/notifyhub`;
}

/**
 * Lista albă de destinatari, pentru mediile care nu sunt producție.
 *
 * Problema, formulată de Academy pentru staging-ul lor și valabilă identic la
 * noi: Preview-ul de pe Vercel primește **aceleași** variabile ca producția —
 * aceeași bază Supabase, aceeași cheie NotifyHub. Deci un deployment de probă
 * vede numerele reale ale clienților și are dreptul să le scrie. Un singur test
 * declanșat din greșeală ajunge la un om adevărat.
 *
 * `SMS_ALLOWLIST` rezolvă asta prin inversarea implicitului: cât timp variabila
 * e setată, **numai** numerele din ea primesc mesaje, orice altceva e refuzat
 * înainte de rețea. Nesetată — cazul producției — nu schimbă nimic.
 *
 * Deliberat aici, în clientul de NotifyHub, nu în procesorul de remindere:
 * ăsta e singurul loc prin care pleacă un SMS, indiferent dacă vine din cron,
 * din kiosk, din OTP sau dintr-un test manual. O gardă pusă mai sus s-ar putea
 * ocoli fără să-și dea nimeni seama.
 */
function allowlistedRecipients(): string[] | null {
  const raw = process.env.SMS_ALLOWLIST?.trim();
  if (!raw) return null;
  const list = raw
    .split(',')
    .map((n) => n.replace(/[\s-]/g, ''))
    .filter(Boolean);
  return list.length > 0 ? list : null;
}

function isAllowedRecipient(to: string): boolean {
  const allowlist = allowlistedRecipients();
  if (!allowlist) return true;
  const normalised = to.replace(/[\s-]/g, '');
  return allowlist.includes(normalised);
}

interface SendSmsRequest {
  to: string;
  message: string;
  templateId?: string;
  data?: Record<string, any>;
  /** Free-form context forwarded to NotifyHub (used by the manual/bulk paths) */
  metadata?: Record<string, any>;
  /**
   * Deduplication key for NotifyHub (Contract C). Matters because sendSms
   * itself retries 3× on 5xx/timeout: without it, a response lost on the wire
   * turns into a second real SMS to the client.
   */
  idempotency_key?: string;
  /** 'otp' | 'reminder' | … — lets NotifyHub bill and report by kind */
  message_type?: string;
  /**
   * Endpoint-ul nostru de DLR (F3.3 la ei). Fără el, confirmarea de livrare
   * moare la NotifyHub și notification_log rămâne pe 'sent' pentru totdeauna.
   */
  callbackUrl?: string;
}

interface SendSmsResponse {
  success: boolean;
  messageId?: string;
  provider?: string;
  parts?: number;
  /**
   * **Cu TVA**, de la schimbarea NotifyHub din 2026-08-09. Înainte era net.
   *
   * Nu-l folosim în contabilizare tocmai din cauza asta: coloana noastră
   * `estimated_cost` trebuie să însemne același lucru cu `estimated_cost` de la
   * ei, altfel două sisteme cu aceeași denumire ar ține numere care diferă cu
   * 21% și nimeni n-ar observa până la prima reconciliere. Pentru bani folosim
   * `costNet`; ăsta rămâne ca să putem arăta suma finală plătită.
   */
  cost?: number;
  /** Suma netă, comparabilă cu factura providerului. Asta se stochează. */
  costNet?: number;
  vat?: number;
  vatRate?: number;
  currency?: string;
  error?: string;
  code?: string;
  /** Upstream HTTP status; 402 = insufficient credits (per-station billing) */
  httpStatus?: number;
}

interface SendSmsOptions {
  /**
   * Send on a specific tenant key instead of the platform key.
   * Used once stations have their own NotifyHub key (per-station credits).
   */
  apiKey?: string;
  /** Forwarded as `idempotency_key` in the request body (Contract C) */
  idempotencyKey?: string;
  /** Forwarded as `message_type` — 'reminder', 'otp', … */
  messageType?: string;
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
  async sendSms(
    request: SendSmsRequest,
    options: SendSmsOptions = {}
  ): Promise<SendSmsResponse> {
    const maxRetries = 3;
    const apiKey = options.apiKey || this.apiKey;
    let lastError: SendSmsResponse | null = null;

    if (!isAllowedRecipient(request.to)) {
      // Forma răspunsului e cea a unui 4xx obișnuit, ca apelantul să-l trateze
      // ca pe orice refuz — fără reîncercare și fără cale specială de eroare.
      console.warn('[NotifyHub] destinatar în afara SMS_ALLOWLIST, nu trimit', {
        to: `${request.to.slice(0, 6)}…`,
      });
      return {
        success: false,
        error: 'Destinatar în afara listei albe a mediului (SMS_ALLOWLIST)',
        code: 'RECIPIENT_NOT_ALLOWLISTED',
        httpStatus: 403,
      };
    }

    const callbackUrl = request.callbackUrl ?? dlrCallbackUrl();
    const payload: SendSmsRequest = {
      ...request,
      ...(options.idempotencyKey ? { idempotency_key: options.idempotencyKey } : {}),
      ...(options.messageType ? { message_type: options.messageType } : {}),
      ...(callbackUrl ? { callbackUrl } : {}),
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/api/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(5000), // 5s timeout per attempt
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          const errorResponse = {
            success: false,
            error: data.error || 'SMS sending failed',
            code: data.code || 'UNKNOWN_ERROR',
            httpStatus: response.status,
          };

          // 429 e singurul 4xx care merită reîncercat: nu spune „cererea ta e
          // greșită", ci „nu acum". NotifyHub a cerut explicit backoff pe el
          // (răspunsul lor din 2026-08-09, §7). Fără asta, o limită atinsă la
          // 09:00 însemna un reminder pierdut pentru toată ziua, deși a doua
          // încercare peste câteva secunde ar fi trecut.
          //
          // Reîncercarea refolosește același `idempotency_key` din payload,
          // deci dacă prima cerere chiar a trecut și doar răspunsul s-a pierdut,
          // clientul nu primește două SMS-uri.
          const retryable429 = response.status === 429;

          if (response.status >= 400 && response.status < 500 && !retryable429) {
            console.error(`[NotifyHub] Client error (no retry): ${response.status}`, errorResponse);
            return errorResponse;
          }

          if (retryable429 && attempt < maxRetries) {
            // `Retry-After` e în secunde când vine; altfel backoff exponențial.
            const retryAfter = Number(response.headers.get('retry-after'));
            const delay = Number.isFinite(retryAfter) && retryAfter > 0
              ? Math.min(retryAfter * 1000, 30_000)
              : Math.pow(2, attempt - 1) * 1000;

            console.warn(`[NotifyHub] Rate limited, retrying in ${delay}ms`);
            lastError = errorResponse;
            await sleep(delay);
            continue;
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

        // FIXED: NotifyHub wraps response in 'data' object
        // Normalize response to match expected schema
        if (data.data) {
          return {
            success: data.success,
            messageId: data.data.messageId,
            provider: data.data.provider,
            parts: data.data.parts,
            cost: data.data.cost,
            // `cost_net` a apărut odată cu trecerea lui `cost` pe brut
            // (2026-08-09). Cât timp flag-urile lor sunt încă în tranziție,
            // un răspuns mai vechi n-are câmpul — atunci `cost` **este** netul.
            costNet: data.data.cost_net ?? data.data.cost,
            vat: data.data.vat,
            vatRate: data.data.vat_rate,
            currency: data.data.currency,
            httpStatus: response.status,
          };
        }

        // Fallback for old schema (if NotifyHub changes back)
        return { ...data, httpStatus: response.status };

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
    stationName: string = 'uitdeitp.ro',
    options: SendSmsOptions & {
      /** Overrides the default body; each caller keeps its exact wording */
      message?: string;
      templateId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<SendSmsResponse> {
    const { message: customMessage, templateId, metadata, ...sendOptions } = options;
    const message =
      customMessage ??
      `Codul tau ${stationName}: ${code}\nIntrodu pe tableta pentru reminder ITP.\nNu ai cerut? Ignora.`;

    return this.sendSms(
      {
        to: phone,
        message,
        templateId: templateId ?? 'verification_code',
        data: {
          code,
          stationName,
        },
        ...(metadata ? { metadata } : {}),
      },
      sendOptions
    );
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
export type { SendSmsRequest, SendSmsResponse, SendSmsOptions };
