import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Tracing
  tracesSampleRate: 0.1, // 10% of transactions for performance monitoring

  // Session Replay
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
  replaysSessionSampleRate: 0.1, // 10% of normal sessions

  // Environment
  environment: process.env.NODE_ENV,

  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Ignore common non-critical errors
  ignoreErrors: [
    'Non-Error exception captured',
    'Non-Error promise rejection captured',
  ],
});
