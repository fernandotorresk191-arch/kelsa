const SETTLEMENT_KEY = "kelsa_settlement";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 год

type StoredSettlement = {
  code: string;
};

function safeParse(raw: string | null): StoredSettlement | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSettlement;
  } catch {
    return null;
  }
}

function readCookie(): StoredSettlement | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SETTLEMENT_KEY}=`));

  return match ? safeParse(decodeURIComponent(match.split("=")[1])) : null;
}

function writeCookie(data: StoredSettlement) {
  if (typeof document === "undefined") return;
  document.cookie = `${SETTLEMENT_KEY}=${encodeURIComponent(
    JSON.stringify(data),
  )}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}

function readLocalStorage(): StoredSettlement | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SETTLEMENT_KEY);
    return safeParse(raw);
  } catch {
    return null;
  }
}

function writeLocalStorage(data: StoredSettlement) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETTLEMENT_KEY, JSON.stringify(data));
  } catch {
    // noop
  }
}

function persist(data: StoredSettlement) {
  writeCookie(data);
  writeLocalStorage(data);
}

export function getStoredSettlement() {
  return readLocalStorage() ?? readCookie();
}

export function storeSettlement(code: string) {
  persist({ code });
}

export function clearStoredSettlement() {
  if (typeof document !== "undefined") {
    document.cookie = `${SETTLEMENT_KEY}=; path=/; max-age=0; samesite=lax`;
  }
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(SETTLEMENT_KEY);
    } catch {
      // noop
    }
  }
}
