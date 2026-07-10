import type zhTW from "./messages/zh-TW.json";

/**
 * The dictionary shape, derived from the canonical `zh-TW.json`. Both locale
 * files must share this structure.
 *
 * This module is imported with `import type` only, so the JSON is never pulled
 * into any runtime bundle — the type is erased at compile time. Actual message
 * values load server-side via `get-dictionary.ts` (server-only) and reach
 * Client Components as a serialized prop through `LocaleProvider`.
 */
export type Dictionary = typeof zhTW;
