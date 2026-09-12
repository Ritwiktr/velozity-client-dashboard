export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

type ErrorBody = { error?: { message?: string; code?: string } };

async function parse(res: Response) {
  const data = (await res.json().catch(() => ({}))) as ErrorBody;
  if (!res.ok) {
    throw new Error(data.error?.message ?? "Request failed");
  }
  return data;
}

async function refresh() {
  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    setAccessToken(null);
    return null;
  }
  const data = (await res.json()) as { accessToken: string };
  setAccessToken(data.accessToken);
  return data.accessToken;
}

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (res.status === 401 && retry && !path.startsWith("/api/auth/")) {
    const next = await refresh();
    if (next) {
      return api<T>(path, init, false);
    }
  }
  return parse(res) as Promise<T>;
}
