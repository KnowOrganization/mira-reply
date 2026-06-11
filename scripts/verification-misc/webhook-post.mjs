// Verification script: POSTs a synthetic, HMAC-signed Instagram comment webhook
// to the local pipeline (Next :3000 proxy -> Elysia :4000 receiver), then the
// same payload again (dedup check), then a bad signature (403 check).
// Run from repo root: bun --env-file=.env.local scripts/verification-misc/webhook-post.mjs
import crypto from "node:crypto";
const secret = process.env.META_APP_SECRET;
const payload = JSON.stringify({
  object: "instagram",
  entry: [{
    id: "verify_test_acct",
    time: Math.floor(Date.now() / 1000),
    changes: [{
      field: "comments",
      value: { id: "verify-test-123", from: { id: "verify_test_user", username: "verify_tester" }, media: { id: "verify_test_media" }, text: "hello from verification" },
    }],
  }],
});
const sig = "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex");
const res = await fetch("http://localhost:3000/api/ig/webhook", {
  method: "POST",
  headers: { "content-type": "application/json", "x-hub-signature-256": sig },
  body: payload,
});
console.log("status:", res.status, "body:", await res.text());
// duplicate delivery — same payload, same eventKey
const res2 = await fetch("http://localhost:3000/api/ig/webhook", {
  method: "POST",
  headers: { "content-type": "application/json", "x-hub-signature-256": sig },
  body: payload,
});
console.log("dup status:", res2.status, "body:", await res2.text());
// bad signature must 403
const res3 = await fetch("http://localhost:3000/api/ig/webhook", {
  method: "POST",
  headers: { "content-type": "application/json", "x-hub-signature-256": "sha256=" + "0".repeat(64) },
  body: payload,
});
console.log("bad-sig status:", res3.status);
