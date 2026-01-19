const CART_TOKEN_KEY = "kelsa_cart_token";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 дней

function generateCartToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  // Фоллбек для старых окружений
  return `cart_${Math.random().toString(36).slice(2, 12)}`;
}

function readCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CART_TOKEN_KEY}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function writeCookie(token: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${CART_TOKEN_KEY}=${encodeURIComponent(
    token
  )}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}

function readLocalStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(CART_TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeLocalStorage(token: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CART_TOKEN_KEY, token);
  } catch {
    // noop
  }
}

function persistToken(token: string) {
  writeCookie(token);
  writeLocalStorage(token);
  return token;
}

export function getStoredCartToken(): string | null {
  return readLocalStorage() ?? readCookie();
}

export function ensureCartToken(): string {
  const existing = getStoredCartToken();
  if (existing) return existing;

  const fresh = generateCartToken();
  return persistToken(fresh);
}

export function replaceCartToken(): string {
  const fresh = generateCartToken();
  return persistToken(fresh);
}
