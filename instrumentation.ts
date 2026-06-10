// Runs once when the Next.js server starts. Importing the watcher module fires
// its module-load self-start (ensureWatcher() if an IG account is connected),
// so the automation loops — 1s real-time comment poll, DM poll, 7s tick, token
// refresh — come up automatically on boot. No route needs to be hit first.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./lib/ig/watcher");
  }
}
