const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['dnowyodhffqqhmakjupo.supabase.co'],
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    instrumentationHook: true,
  },
  /**
   * Ecranele de autentificare au trăit în două locuri; cel canonic e /auth/*.
   * URL-urile vechi rămân valide — pot fi în semne de carte sau în emailuri
   * deja trimise — dar redirectul se face aici, nu într-o pagină.
   *
   * O pagină cu redirect() e prerenderată static, deci mutarea se întâmplă
   * abia după hidratare: utilizatorul vede o clipă un ecran gol, iar un client
   * fără JS nu ajunge nicăieri. Aici e un 308 real, servit la margine, fără
   * nicio invocare de server.
   */
  async redirects() {
    return [
      { source: '/login', destination: '/auth/login', permanent: true },
      { source: '/register', destination: '/auth/register', permanent: true },
      { source: '/forgot-password', destination: '/auth/forgot-password', permanent: true },
    ];
  },
};

// Sentry configuration
const sentryWebpackPluginOptions = {
  // Suppresses source map uploading logs during build
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Only upload source maps in production
  authToken: process.env.SENTRY_AUTH_TOKEN,
};

module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
