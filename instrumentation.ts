// Runs once when the Next.js server starts. The polling watcher is retired —
// ingestion is webhook-first now (Elysia receiver → BullMQ → worker), so the
// Next process boots nothing. Kept as a no-op hook for future boot needs.
export async function register() {}
