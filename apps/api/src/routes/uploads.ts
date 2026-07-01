// Local-disk image hosting for Schedule's photo picker — no S3/R2/Supabase
// Storage is wired up anywhere in this repo (checked; only DATABASE_URL
// exists), and IG's Content Publishing API requires a public HTTPS image_url
// it fetches server-side, so a data: URL from the device picker won't work.
// This reuses the tunnel already exposing the API publicly instead of
// standing up a new cloud-storage account. ponytail: local disk, not a CDN —
// fine for a handful of scheduled-post photos; the ceiling is the file only
// stays servable as long as this process + its public tunnel are up, which
// matters at schedule-time and again whenever the worker sweep actually
// publishes. Swap to real object storage once a bucket + credentials exist —
// only this file changes, callers just get a URL back either way.
import { Elysia } from "elysia";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { authPlugin } from "../plugins/auth";

const UPLOAD_DIR = path.join(import.meta.dir, "..", "..", "uploads");
const SAFE_FILENAME = /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/;
const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic",
};

export const uploadsRoute = new Elysia()
  .use(authPlugin)
  .post("/api/ig/publishing/upload", async ({ auth, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const b = (body ?? {}) as { base64?: string; ext?: string };
    if (!b.base64) { set.status = 400; return { error: "base64 required" }; }
    const ext = (b.ext ?? "jpg").replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "jpg";
    if (!(ext in EXT_TO_MIME)) { set.status = 400; return { error: "unsupported image type" }; }
    const filename = `${crypto.randomUUID()}.${ext}`;
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, filename), Buffer.from(b.base64, "base64"));
    return { path: `/uploads/${filename}` };
  }, { requireRole: "agent" })
  // Public — no auth. Meta's servers fetch this URL directly when creating a
  // media container, and they don't carry our session token.
  .get("/uploads/:file", async ({ params, set }) => {
    if (!SAFE_FILENAME.test(params.file)) { set.status = 400; return { error: "invalid filename" }; }
    const ext = params.file.split(".").pop()!.toLowerCase();
    const mime = EXT_TO_MIME[ext];
    if (!mime) { set.status = 400; return { error: "unsupported image type" }; }
    const filePath = path.join(UPLOAD_DIR, params.file);
    const file = Bun.file(filePath);
    if (!(await file.exists())) { set.status = 404; return { error: "not found" }; }
    set.headers["content-type"] = mime;
    return file;
  });
