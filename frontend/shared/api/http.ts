import { API_URL } from "./config";
import { getStoredAccessToken } from "../auth/token";

const ADMIN_TOKEN_KEY = "admin_token";

function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

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

  // Для admin/upload API используем admin токен, иначе пользовательский
  const isAdminPath = path.includes('/admin') || path.includes('/upload');
  const token = isAdminPath ? getAdminToken() : getStoredAccessToken();
  
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

export function apiPut<T, B = unknown>(
  path: string,
  body?: B,
  init?: Omit<RequestInit, "method" | "body">
) {
  return apiRequest<T>(path, {
    ...init,
    method: "PUT",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// Upload файлов через FormData (без Content-Type - браузер установит автоматически)
export async function apiUpload<T>(
  path: string,
  formData: FormData,
  init?: Omit<RequestInit, "method" | "body">
): Promise<T> {
  const headers = new Headers();

  // Для admin/upload API используем admin токен
  const isAdminPath = path.includes('/admin') || path.includes('/upload');
  const token = isAdminPath ? getAdminToken() : getStoredAccessToken();
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (init?.headers) {
    const override = new Headers(init.headers as HeadersInit);
    override.forEach((value, key) => headers.set(key, value));
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) throw await parseError(res);

  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return (await res.json()) as T;
  }

  return (await res.text()) as unknown as T;
}

export const http = {
  get: apiGet,
  post: apiPost,
  patch: apiPatch,
  put: apiPut,
  delete: apiDelete,
  upload: apiUpload,
};
