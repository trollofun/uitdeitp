/* eslint-disable no-console */
/**
 * Logging utility that conditionally logs based on environment
 * In production, should integrate with Sentry, LogRocket, or similar
 */

import * as Sentry from '@sentry/nextjs';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * Log informational message (development only)
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`[INFO] ${message}`, context || '');
    }
  }

  /**
   * Log warning message (development only)
   */
  warn(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, context || '');
    }
  }

  /**
   * Log error message (always logged; reported to Sentry outside development)
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, error, context || '');
      return;
    }

    console.error(`[ERROR] ${message}`, context || '');
    try {
      if (error instanceof Error) {
        Sentry.captureException(error, { extra: { message, ...context } });
      } else {
        Sentry.captureMessage(message, { level: 'error', extra: { error, ...context } });
      }
    } catch {
      // Reporting must never take down the caller.
    }
  }

  /**
   * Log debug message (development only)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, context || '');
    }
  }
}

export const logger = new Logger();
