import { MEDIA_BASE_URL } from "./config";

export function resolveMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  // если в БД хранится "/uploads/.."
  const base = MEDIA_BASE_URL.endsWith("/") ? MEDIA_BASE_URL.slice(0, -1) : MEDIA_BASE_URL;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
}