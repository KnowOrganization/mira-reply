// Opportunity pipeline endpoints (recovered from 764af50's catalog.ts). Reads
// the opportunities table + the CRM's own crm_conversations/crm_messages/contacts
// (separate from the DM pipeline). Powers the Opportunities Kanban + drawer.
import { Elysia } from "elysia";
import { query } from "@shaiz/db";
import { authPlugin } from "../plugins/auth";

export const opportunitiesRoute = new Elysia()
  .use(authPlugin)
  .get("/api/ig/crm/opportunities", async ({ auth, query: q, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const args: unknown[] = [auth.accountId];
    let cond = "o.account_id = $1";
    if (typeof q.status === "string" && q.status) { args.push(q.status); cond += ` AND o.status = $${args.length}`; }
    const opportunities = await query(
      `SELECT o.id, o.type, o.confidence, o.value_estimate, o.status, o.reason, o.notes, o.detected_at, o.conversation_id,
              ct.igsid, ct.display_name, ct.lead_status,
              (SELECT m.body->>'text' FROM crm_messages m WHERE m.conversation_id = o.conversation_id ORDER BY m.created_at DESC LIMIT 1) AS last_text
       FROM opportunities o
       LEFT JOIN crm_conversations cv ON cv.id = o.conversation_id
       LEFT JOIN contacts ct ON ct.id = cv.contact_id
       WHERE ${cond}
       ORDER BY o.detected_at DESC LIMIT 300`,
      args
    );
    return { opportunities };
  }, { auth: true })
  .get("/api/ig/crm/opportunities/:id", async ({ auth, params, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const [opportunity] = await query<{ conversation_id: string }>(
      `SELECT o.id, o.type, o.confidence, o.value_estimate, o.status, o.reason, o.notes, o.detected_at, o.conversation_id,
              ct.id AS contact_id, ct.igsid, ct.display_name, ct.lead_status, ct.tags, ct.email, ct.phone
       FROM opportunities o
       LEFT JOIN crm_conversations cv ON cv.id = o.conversation_id
       LEFT JOIN contacts ct ON ct.id = cv.contact_id
       WHERE o.account_id = $1 AND o.id = $2`,
      [auth.accountId, params.id]
    );
    if (!opportunity) { set.status = 404; return { error: "not found" }; }
    const messages = await query(
      `SELECT id, direction, type, body, sent_by, created_at FROM crm_messages
       WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [opportunity.conversation_id]
    );
    return { opportunity, messages: messages.reverse() };
  }, { auth: true })
  .patch("/api/ig/crm/opportunities/:id", async ({ auth, params, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const b = (body ?? {}) as { status?: string; value_estimate?: number | null; notes?: string };
    const sets: string[] = [];
    const args: unknown[] = [auth.accountId, params.id];
    if (typeof b.status === "string") { args.push(b.status); sets.push(`status = $${args.length}`); }
    if (b.value_estimate !== undefined) { args.push(b.value_estimate); sets.push(`value_estimate = $${args.length}`); }
    if (typeof b.notes === "string") { args.push(b.notes); sets.push(`notes = $${args.length}`); }
    if (!sets.length) { set.status = 400; return { error: "no valid fields (status|value_estimate|notes)" }; }
    const rows = await query(
      `UPDATE opportunities SET ${sets.join(", ")} WHERE account_id = $1 AND id = $2 RETURNING *`,
      args
    );
    if (!rows[0]) { set.status = 404; return { error: "not found" }; }
    return { opportunity: rows[0] };
  }, { requireRole: "agent" })
  .get("/api/ig/crm/decisions", async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const decisions = await query(
      `SELECT id, conversation_id, comment_id, decision, confidence, risk_level, reason, created_at
       FROM decision_log WHERE account_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [auth.accountId]
    );
    return { decisions };
  }, { auth: true });
