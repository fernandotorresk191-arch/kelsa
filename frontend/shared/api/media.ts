import { API_URL } from "./config";

export function resolveMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  // если в БД хранится "/uploads/.."
  const base = API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
}