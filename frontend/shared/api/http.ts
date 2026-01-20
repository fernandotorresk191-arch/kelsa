import { API_URL } from "./config";
import { getStoredAccessToken } from "../auth/token";

export type ApiError = {
  status: number;
  message: string;
  details?: string;
};

async function parseError(res: Response) {
  const text = await res.text().catch(() => "");
  return {
    status: res.status,
    message: `${res.status} ${res.statusText}`,
    details: text || undefined,
  } satisfies ApiError;
}

async function apiRequest<T>(
  path: string,
  init: RequestInit
): Promise<T> {
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  const token = getStoredAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (init.headers) {
    const override = new Headers(init.headers as HeadersInit);
    override.forEach((value, key) => headers.set(key, value));
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) throw await parseError(res);

  // Try to parse JSON if possible, otherwise return text.
  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return (await res.json()) as T;
  }

  return (await res.text()) as unknown as T;
}

export function apiGet<T>(
  path: string,
  init?: Omit<RequestInit, "method">
) {
  return apiRequest<T>(path, { ...init, method: "GET" });
}

export function apiPost<T, B = unknown>(
  path: string,
  body?: B,
  init?: Omit<RequestInit, "method" | "body">
) {
  return apiRequest<T>(path, {
    ...init,
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiPatch<T, B = unknown>(
  path: string,
  body?: B,
  init?: Omit<RequestInit, "method" | "body">
) {
  return apiRequest<T>(path, {
    ...init,
    method: "PATCH",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiDelete<T>(
  path: string,
  init?: Omit<RequestInit, "method">
) {
  return apiRequest<T>(path, { ...init, method: "DELETE" });
}
