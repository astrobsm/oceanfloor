const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

const TOKEN_KEY = "oceanfloor.auth.token";

// --------------------------------------------------------------------------- //
// Token storage (localStorage-backed bearer token)                            //
// --------------------------------------------------------------------------- //
let inMemoryToken: string | null = null;

export function getToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  try {
    inMemoryToken = localStorage.getItem(TOKEN_KEY);
  } catch {
    inMemoryToken = null;
  }
  return inMemoryToken;
}

export function setToken(token: string): void {
  inMemoryToken = token;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage may be unavailable (private mode) — keep in memory */
  }
}

export function clearToken(): void {
  inMemoryToken = null;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

// Listeners notified when the server rejects our credentials (401 on a request).
type UnauthorizedHandler = () => void;
const unauthorizedHandlers = new Set<UnauthorizedHandler>();

export function onUnauthorized(handler: UnauthorizedHandler): () => void {
  unauthorizedHandlers.add(handler);
  return () => {
    unauthorizedHandlers.delete(handler);
  };
}

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail || `Request failed (${status})`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra || {}),
  };
}

async function handle(res: Response): Promise<Response> {
  if (!res.ok) {
    const raw = await res.text();
    let detail: unknown = raw;
    try {
      const parsed = JSON.parse(raw);
      detail = parsed.detail ?? raw;
      if (Array.isArray(detail)) {
        detail = (detail as Array<{ msg?: string }>)
          .map((d) => d.msg ?? "")
          .filter(Boolean)
          .join("; ");
      }
    } catch {
      /* not JSON — keep raw text */
    }
    if (res.status === 401) {
      // Credentials are stale/invalid; let the app reset its auth state.
      clearToken();
      unauthorizedHandlers.forEach((h) => h());
    }
    throw new ApiError(res.status, typeof detail === "string" ? detail : raw);
  }
  return res;
}

// --------------------------------------------------------------------------- //
// Core verbs (auth header injected automatically)                             //
// --------------------------------------------------------------------------- //
export async function apiPost<TResponse>(
  path: string,
  body: unknown
): Promise<TResponse> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  await handle(res);
  return res.json() as Promise<TResponse>;
}

export async function apiGet<TResponse>(
  path: string,
  headers?: Record<string, string>
): Promise<TResponse> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers: authHeaders(headers),
  });
  await handle(res);
  return res.json() as Promise<TResponse>;
}

export async function apiPatch<TResponse>(
  path: string,
  body: unknown
): Promise<TResponse> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  await handle(res);
  return res.json() as Promise<TResponse>;
}

export async function apiDelete<TResponse>(path: string): Promise<TResponse> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  await handle(res);
  return res.json() as Promise<TResponse>;
}

export async function apiPostWithHeaders<TResponse>(
  path: string,
  body: unknown,
  headers: Record<string, string>
): Promise<TResponse> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json", ...headers }),
    body: JSON.stringify(body),
  });
  await handle(res);
  return res.json() as Promise<TResponse>;
}

export async function apiPostBlob(
  path: string,
  body: unknown
): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  await handle(res);
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="?([^";]+)"?/.exec(disposition);
  const filename = match?.[1] ?? "download";
  const blob = await res.blob();
  return { blob, filename };
}

export async function apiPostMultipart<TResponse>(
  path: string,
  formData: FormData
): Promise<TResponse> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  await handle(res);
  return res.json() as Promise<TResponse>;
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
