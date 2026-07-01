// Minimal observability seam shared by the API and worker.
//
//  - logEvent(): one structured JSON line to stdout. Railway/Vercel/any log
//    aggregator ingests these — this is what makes a prod incident visible.
//  - captureError(): always logs the error as JSON; ALSO forwards to Sentry IF
//    SENTRY_DSN is set and @sentry/node is installed. No hard dependency: the
//    SDK is loaded via a guarded dynamic import, so the default path pulls in
//    nothing. To enable Sentry: `bun add @sentry/node` and set SENTRY_DSN.
//
// ponytail: stdout JSON now (zero deps); Sentry lights up the moment a DSN +
// the SDK are present — no rewrite needed.

type AnySentry = {
  init: (o: Record<string, unknown>) => void;
  captureException: (e: unknown, hint?: Record<string, unknown>) => void;
};

let sentry: AnySentry | null = null;
let initStarted = false;

export function logEvent(event: string, fields: Record<string, unknown> = {}): void {
  try {
    console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...fields }));
  } catch {
    console.log(event);
  }
}

export async function initObservability(service: string): Promise<void> {
  if (initStarted) return;
  initStarted = true;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  try {
    // Concatenated specifier: keeps the optional SDK out of type resolution and
    // bundler graphs. Throws (and is caught) when the package isn't installed.
    const mod = (await import(("@sentry" + "/node") as string)) as AnySentry;
    mod.init({
      dsn,
      environment: process.env.NODE_ENV ?? "development",
      tracesSampleRate: 0, // errors only — no perf tracing / auto-instrumentation
      integrations: [],
    });
    sentry = mod;
    logEvent("obs.sentry.enabled", { service });
  } catch (e) {
    logEvent("obs.sentry.init_failed", { service, error: String(e) });
  }
}

export function captureError(err: unknown, context: Record<string, unknown> = {}): void {
  const message = err instanceof Error ? err.stack ?? err.message : String(err);
  logEvent("error", { ...context, message });
  if (sentry) {
    try {
      sentry.captureException(err, { extra: context });
    } catch {
      /* never let reporting throw */
    }
  }
}
