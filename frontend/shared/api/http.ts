import { API_URL } from "./config";

type ApiError = {
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

export async function apiGet<T>(
  path: string,
  init?: Omit<RequestInit, "method">
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    // Для server components можно включать кеш/ISR, если захочешь:
    // next: { revalidate: 60 },
  });

  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}
