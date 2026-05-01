import { generateText } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import type { JSONContent } from "@tiptap/core";

const CHARS_PER_MINUTE = 300; // CJK-leaning average; close enough for English mix.

/**
 * Quick estimate of how long a Tiptap article takes to read. Returns at least
 * 1 minute so the badge never says "0 min".
 */
export function estimateReadingTime(
  content: JSONContent | Record<string, unknown> | null | undefined,
): { minutes: number; chars: number } {
  if (!content || Object.keys(content).length === 0) {
    return { minutes: 0, chars: 0 };
  }
  let text = "";
  try {
    text = generateText(content as JSONContent, [StarterKit]);
  } catch {
    return { minutes: 0, chars: 0 };
  }
  const chars = text.replace(/\s+/g, "").length;
  const minutes = chars > 0 ? Math.max(1, Math.ceil(chars / CHARS_PER_MINUTE)) : 0;
  return { minutes, chars };
}
