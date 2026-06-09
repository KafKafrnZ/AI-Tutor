/**
 * Next.js App Router instrumentation hook.
 * This file is the correct entry point for Sentry initialization in Next.js 15+.
 * It is called once per runtime (Node.js server, Edge runtime, and client).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
