const ACCESS_TOKEN_KEY = "kelsa_access_token";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 дней

function readCookie(): string | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${ACCESS_TOKEN_KEY}=`));

  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function writeCookie(token: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${ACCESS_TOKEN_KEY}=${encodeURIComponent(
    token,
  )}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}

function readLocalStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeLocalStorage(token: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } catch {
    // noop
  }
}

function persist(token: string) {
  writeCookie(token);
  writeLocalStorage(token);
}

export function getStoredAccessToken() {
  return readLocalStorage() ?? readCookie();
}

export function storeAccessToken(token: string) {
  persist(token);
}

export function clearStoredAccessToken() {
  if (typeof document !== "undefined") {
    document.cookie = `${ACCESS_TOKEN_KEY}=; path=/; max-age=0; samesite=lax`;
  }
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    } catch {
      // noop
    }
  }
}
