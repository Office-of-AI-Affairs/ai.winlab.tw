import "server-only";

import type { Locale } from "./config";
import type { Dictionary } from "./dictionary";

// Lazy per-locale imports so the unused locale's messages never ship in a
// given render's payload.
const loaders: Record<Locale, () => Promise<Dictionary>> = {
  "zh-TW": () => import("./messages/zh-TW.json").then((m) => m.default),
  en: () => import("./messages/en.json").then((m) => m.default as Dictionary),
};

export function getDictionary(locale: Locale): Promise<Dictionary> {
  return loaders[locale]();
}
