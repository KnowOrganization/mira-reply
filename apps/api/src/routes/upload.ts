// Minimal image relay: mobile posts a base64 data URL, we persist it to local
// disk and hand back a fetchable URL. Meta's CDN pulls DM image attachments
// from this URL, so in production PUBLIC_BASE_URL must be the public origin
// (ngrok/domain) — localhost only works for previewing in-app.
import { Elysia } from "elysia";
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { authPlugin } from "../plugins/auth";

const UPLOAD_DIR = join(process.cwd(), "uploads");
const MAX_BYTES = 8 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

export const uploadRoute = new Elysia()
  .use(authPlugin)
  .post("/api/upload", async ({ auth, body, set, request }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const { dataUrl } = (body ?? {}) as { dataUrl?: string };
    const m = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(dataUrl ?? "");
    if (!m || !EXT[m[1]]) { set.status = 400; return { error: "expected a base64 image data URL" }; }
    const bytes = Buffer.from(m[2], "base64");
    if (bytes.length > MAX_BYTES) { set.status = 413; return { error: "image too large (8MB max)" }; }
    if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
    const name = `${auth.accountId.slice(0, 8)}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}.${EXT[m[1]]}`;
    writeFileSync(join(UPLOAD_DIR, name), bytes);
    const base = process.env.PUBLIC_BASE_URL || new URL(request.url).origin;
    return { url: `${base}/uploads/${name}` };
  }, { auth: true })
  .get("/uploads/:name", ({ params, set }) => {
    // no path traversal — the name is our own generated slug
    if (!/^[a-z0-9_.-]+$/i.test(params.name)) { set.status = 400; return { error: "bad name" }; }
    const file = Bun.file(join(UPLOAD_DIR, params.name));
    return file;
  });
