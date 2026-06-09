import * as Sentry from "@sentry/nextjs";

// Only initialise when a DSN is explicitly provided — avoids console warnings in dev
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
    debug: false,
    integrations: [],
  });
}
