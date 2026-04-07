import { API_URL } from "./config";
import { getStoredAccessToken } from "../auth/token";

const ADMIN_TOKEN_KEY = "admin_token";
const COURIER_TOKEN_KEY = "courier_token";
const ADMIN_DARKSTORE_KEY = "admin_darkstore_id";

function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

function getCourierToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(COURIER_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getAdminDarkstoreId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ADMIN_DARKSTORE_KEY);
  } catch {
    return null;
  }
}

export function setAdminDarkstoreId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) {
      window.localStorage.setItem(ADMIN_DARKSTORE_KEY, id);
    } else {
      window.localStorage.removeItem(ADMIN_DARKSTORE_KEY);
    }
  } catch {
    // ignore
  }
}

export type ApiError = {
  status: number;
  message: string;
  details?: string;
};

async function parseError(res: Response) {
  const text = await res.text().catch(() => "");
  let serverMessage: string | undefined;
  try {
    const json = JSON.parse(text);
    if (typeof json.message === "string") serverMessage = json.message;
  } catch { /* not JSON */ }
  return {
    status: res.status,
    message: serverMessage || `${res.status} ${res.statusText}`,
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

  // Для courier API используем курьерский токен
  // Для admin/upload API используем admin токен, иначе пользовательский
  // Важно: /v1/admin/couriers - это админский путь, а /v1/courier/ - курьерский
  const isCourierPath = path.includes('/courier/') || path.includes('/courier-auth');
  const isAdminPath = path.includes('/admin') || path.includes('/upload');
  const token = isCourierPath 
    ? getCourierToken() 
    : isAdminPath 
      ? getAdminToken() 
      : getStoredAccessToken();
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Inject X-Darkstore-Id for admin requests
  if (isAdminPath) {
    const darkstoreId = getAdminDarkstoreId();
    if (darkstoreId) {
      headers.set("X-Darkstore-Id", darkstoreId);
    }
  }

  if (init.headers) {
    const override = new Headers(init.headers as HeadersInit);
    override.forEach((value, key) => headers.set(key, value));
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
    });
  } catch (networkError) {
    // Сетевая ошибка (сервер недоступен, CORS и т.д.)
    const errorMessage = networkError instanceof Error 
      ? networkError.message 
      : 'Ошибка сети';
    throw {
      status: 0,
      message: `Сервер недоступен: ${errorMessage}`,
      details: `Не удалось подключиться к ${API_URL}${path}`,
    } satisfies ApiError;
  }

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

  // Для courier API используем курьерский токен
  // Для admin/upload API используем admin токен
  // Важно: /v1/admin/couriers - это админский путь, а /v1/courier/ - курьерский
  const isCourierPath = path.includes('/courier/') || path.includes('/courier-auth');
  const isAdminPath = path.includes('/admin') || path.includes('/upload');
  const token = isCourierPath 
    ? getCourierToken() 
    : isAdminPath 
      ? getAdminToken() 
      : getStoredAccessToken();
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Inject X-Darkstore-Id for admin uploads
  if (isAdminPath) {
    const darkstoreId = getAdminDarkstoreId();
    if (darkstoreId) {
      headers.set("X-Darkstore-Id", darkstoreId);
    }
  }

  if (init?.headers) {
    const override = new Headers(init.headers as HeadersInit);
    override.forEach((value, key) => headers.set(key, value));
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      method: "POST",
      headers,
      body: formData,
    });
  } catch (networkError) {
    // Сетевая ошибка (сервер недоступен, CORS и т.д.)
    const errorMessage = networkError instanceof Error 
      ? networkError.message 
      : 'Ошибка сети';
    throw {
      status: 0,
      message: `Сервер недоступен: ${errorMessage}`,
      details: `Не удалось подключиться к ${API_URL}${path}`,
    } satisfies ApiError;
  }

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
