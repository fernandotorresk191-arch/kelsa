const DEFAULT_COUNTRY = "7";
const MAX_DIGITS = 11;

export function formatRuPhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";

  let normalized = digits;
  if (normalized.startsWith("8")) {
    normalized = `${DEFAULT_COUNTRY}${normalized.slice(1)}`;
  } else if (normalized.startsWith("9")) {
    normalized = `${DEFAULT_COUNTRY}${normalized}`;
  } else if (!normalized.startsWith(DEFAULT_COUNTRY)) {
    normalized = `${DEFAULT_COUNTRY}${normalized}`;
  }

  normalized = normalized.slice(0, MAX_DIGITS);

  const country = normalized[0];
  const rest = normalized.slice(1);

  let result = `+${country}`;

  if (rest.length > 0) {
    result += ` (${rest.slice(0, 3)}`;
  }
  if (rest.length >= 3) {
    result += ")";
  }
  if (rest.length > 3) {
    result += ` ${rest.slice(3, 6)}`;
  }
  if (rest.length > 6) {
    result += `-${rest.slice(6, 8)}`;
  }
  if (rest.length > 8) {
    result += `-${rest.slice(8, 10)}`;
  }

  return result;
}
