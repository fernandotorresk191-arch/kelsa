const DEFAULT_API_URL = "http://localhost:3001";

function resolveApiUrl() {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  const hasWindow = typeof window !== "undefined";

  if (envUrl) {
    try {
      const parsed = new URL(envUrl);
      const isLocal =
        parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";

      if (
        hasWindow &&
        isLocal &&
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1"
      ) {
        // When opening the app from another device (e.g. phone), reuse the current host
        // but keep the API port from the env value (defaults to 3001).
        const port = parsed.port || "3001";
        return `${window.location.protocol}//${window.location.hostname}:${port}`;
      }

      return envUrl;
    } catch {
      // Fall through to other strategies if env URL is malformed.
    }
  }

  if (hasWindow) {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }

  return DEFAULT_API_URL;
}

export const API_URL = resolveApiUrl();
