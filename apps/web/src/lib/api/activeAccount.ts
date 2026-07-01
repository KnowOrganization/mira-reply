// Active account/org selection lives in cookies (same-origin → forwarded to the
// API through the Next rewrite; the API's requireUser reads them). Switching
// reloads the page so every account-scoped query refetches under the new
// selection — but query keys aren't scoped by account/org id, so the
// persisted (localStorage) query cache must be dropped first, or the reload
// would rehydrate the *previous* account's data before revalidating.
import { QUERY_CACHE_KEY } from "@/components/Providers";

const ACCOUNT = "mira_active_account";
const ORG = "mira_active_org";

function read(name: string): string | null {
  if (typeof document === "undefined") return null;
  for (const part of document.cookie.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}
function write(name: string, value: string) {
  // 1-year, lax, path=/ — readable by the API on every same-origin request.
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
}

export const getActiveAccount = () => read(ACCOUNT);
export const getActiveOrg = () => read(ORG);

function dropPersistedCache() {
  try { window.localStorage.removeItem(QUERY_CACHE_KEY); } catch {}
}

export function setActiveAccount(accountId: string, orgId?: string | null) {
  write(ACCOUNT, accountId);
  if (orgId) write(ORG, orgId);
  dropPersistedCache();
  window.location.reload();
}

export function setActiveOrg(orgId: string) {
  write(ORG, orgId);
  dropPersistedCache();
  window.location.reload();
}
