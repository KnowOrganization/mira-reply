# verification-misc

One-off scripts used to verify the webhook-first pipeline end-to-end (2026-06-11 run).
Kept here per "never delete files" rule — safe to rerun, all idempotent, all use
synthetic `verify_test_acct` / `verify-test@example.invalid` identifiers only.

Run everything from repo root with `bun --env-file=.env.local scripts/verification-misc/<file>`.

| File | What it does |
|---|---|
| `check-tables.mjs` | Lists public tables on DATABASE_URL (Supabase reachability check) |
| `webhook-post.mjs` | POSTs signed synthetic comment webhook → dup POST (dedup check) → bad-sig POST (403 check) |
| `check-event.mjs` | Reads the synthetic row back from `webhook_events` (processed_at / error) |
| `verify-guarded-endpoints.ts` | Creates throwaway better-auth user+session, probes guarded `/api/ig/*` endpoints with bearer token |
| `cleanup-test-user.mjs` | SQL cleanup for the throwaway auth user/session (in-script cleanup throws in better-auth adapter) |
| `cleanup-events.mjs` | SQL cleanup for synthetic `webhook_events` rows |

Order for a full rerun: servers up (`bun run dev`, `bun run dev:api`, `MIRA_OUTBOUND_DISABLED=1 bun run worker:watch`) →
`webhook-post.mjs` → `check-event.mjs` → `verify-guarded-endpoints.ts` → `cleanup-test-user.mjs` → `cleanup-events.mjs`.
