// Single typed API client. Same-origin → the BetterAuth session cookie is sent
// automatically (no token plumbing, no fetch monkey-patch). Used as the queryFn/
// mutationFn for TanStack Query.
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

// Active account/org ride as headers (cookies also carry them; header wins on
// the API). Read from cookie so SSR/no-window is a safe no-op.
function activeHeaders(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const h: Record<string, string> = {};
  for (const [name, header] of [["mira_active_account", "x-mira-account"], ["mira_active_org", "x-mira-org"]] as const) {
    const m = document.cookie.split(";").map((s) => s.trim()).find((s) => s.startsWith(name + "="));
    if (m) h[header] = decodeURIComponent(m.slice(name.length + 1));
  }
  return h;
}

export async function apiFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "same-origin",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...activeHeaders(),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let msg = res.statusText;
    try { msg = (await res.json())?.error ?? msg; } catch {}
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get("content-type") || "";
  return (ct.includes("application/json") ? await res.json() : (await res.text())) as T;
}

/** Convenience helpers. */
export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
