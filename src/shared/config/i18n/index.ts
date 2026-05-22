import { ko, type KoKey } from "./ko";
import { en } from "./en";

export type Locale = "ko" | "en";
const DEFAULT_LOCALE: Locale = "ko";
const DICTS = { ko, en } as const;

/**
 * Tiny i18n helper. ko is source of truth. Interpolates {param} tokens.
 */
export function t(key: KoKey, params?: Record<string, string | number>, locale: Locale = DEFAULT_LOCALE): string {
  const raw = DICTS[locale][key] ?? ko[key] ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k: string) =>
    params[k] != null ? String(params[k]) : `{${k}}`,
  );
}

export { ko, en };
export type { KoKey };
