const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

async function handle(res: Response): Promise<Response> {
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Request failed (${res.status}): ${detail}`);
  }
  return res;
}

export async function apiPost<TResponse>(
  path: string,
  body: unknown
): Promise<TResponse> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
    headers: { ...(headers || {}) },
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
    headers: { "Content-Type": "application/json", ...headers },
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
    headers: { "Content-Type": "application/json" },
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
