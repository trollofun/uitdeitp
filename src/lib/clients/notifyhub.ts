/**
 * NotifyHub Client
 * Integration with NotifyHub standalone SMS service
 */

interface SendSmsRequest {
  to: string;
  message: string;
  priority?: 'high' | 'normal' | 'low';
}

interface SendSmsResponse {
  success: boolean;
  data?: {
    messageId: string;
    status: string;
    to: string;
    parts: number;
    messageLength: number;
    provider: string;
    sentAt: string;
  };
  error?: {
    message: string;
    code: string;
    details?: unknown;
  };
}

interface NotifyHubClientConfig {
  baseUrl: string;
  apiKey?: string;
  maxRetries?: number;
  retryDelay?: number;
}

export class NotifyHubClient {
  private baseUrl: string;
  private apiKey?: string;
  private maxRetries: number;
  private retryDelay: number;

  constructor(config: NotifyHubClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = config.apiKey;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelay = config.retryDelay ?? 1000; // 1 second
  }

  /**
   * Send SMS via NotifyHub
   * Uses /api/send-direct endpoint (no queue, direct send)
   */
  async sendSms(request: SendSmsRequest): Promise<SendSmsResponse> {
    const url = `${this.baseUrl}/api/send-direct`;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        // Add API key if provided (for production use with /api/send)
        if (this.apiKey) {
          headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            to: request.to,
            message: request.message,
            priority: request.priority || 'normal',
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error?.message || `HTTP ${response.status}: ${response.statusText}`
          );
        }

        if (!data.success) {
          throw new Error(data.error?.message || 'SMS send failed');
        }

        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on final attempt
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * attempt; // Exponential backoff
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    throw new Error(
      `Failed to send SMS after ${this.maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Send SMS with template
   * Replaces placeholders in template with provided variables
   */
  async sendSmsWithTemplate(
    to: string,
    template: string,
    variables: Record<string, string>,
    priority?: 'high' | 'normal' | 'low'
  ): Promise<SendSmsResponse> {
    let message = template;

    // Replace variables in template
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      message = message.replace(new RegExp(placeholder, 'g'), value);
    }

    return this.sendSms({ to, message, priority });
  }

  /**
   * Validate phone number format
   */
  static isValidPhoneNumber(phone: string): boolean {
    return /^\+40\d{9}$/.test(phone);
  }

  /**
   * Format phone number to E.164 format
   * Converts 0740123456 -> +40740123456
   */
  static formatPhoneNumber(phone: string): string {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');

    // Handle different formats
    if (digits.startsWith('40') && digits.length === 11) {
      return `+${digits}`;
    }

    if (digits.startsWith('0') && digits.length === 10) {
      return `+4${digits}`;
    }

    // Already in correct format or invalid
    return phone;
  }

  /**
   * Sleep utility for retries
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create default NotifyHub client instance
 */
export function createNotifyHubClient(): NotifyHubClient {
  const baseUrl = process.env.NOTIFYHUB_BASE_URL || 'http://localhost:3001';
  const apiKey = process.env.NOTIFYHUB_API_KEY; // Optional, for production

  return new NotifyHubClient({
    baseUrl,
    apiKey,
    maxRetries: 3,
    retryDelay: 1000,
  });
}

// Default SMS templates
export const SMS_TEMPLATES = {
  itp: `Buna {{name}},

Te informam ca ITP pentru vehiculul {{plate}} expira pe {{expiry_date}}.

Este recomandat sa programezi revizia tehnica cu cel putin 7 zile inainte.

Multumim,
{{station_name}}`,

  rca: `Buna {{name}},

RCA pentru vehiculul {{plate}} expira pe {{expiry_date}}.

Asigura-te ca innoiesti asigurarea pentru a evita amenzile.

Multumim,
{{station_name}}`,

  rovinieta: `Buna {{name}},

Rovinieta pentru vehiculul {{plate}} expira pe {{expiry_date}}.

Poti reinnoi rovinieta online pe: https://roviniete.ro

Multumim,
{{station_name}}`,
};
