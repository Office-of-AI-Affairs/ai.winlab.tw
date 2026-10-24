import type { RowResult } from "@/lib/actions/rows";
import { markdownToTiptap } from "@/lib/mcp/markdown-to-tiptap";

// Every tool answers { success, data } or { success: false, error } as JSON
// text. Tools act through the same server actions as the site, so the same
// permission rules apply (lib/permissions/rows.ts and friends).

export function success(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }) }] };
}

export function error(message: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: message }) }],
    isError: true,
  };
}

/** A row action's result as a tool answer. */
export function answer(result: RowResult | { ok: true } | { ok: false; error: string }) {
  if (!result.ok) return error(result.error);
  return success("row" in result ? result.row : { ok: true });
}

/** Markdown (default) or Tiptap JSON text into Tiptap JSON. */
export function processContent(content: string, contentFormat: string | undefined): Record<string, unknown> {
  if (contentFormat === "tiptap") return JSON.parse(content);
  return markdownToTiptap(content);
}

/** Only the keys whose value was given. */
export function defined<T extends Record<string, unknown>>(values: T): Partial<T> {
  return Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/** The given columns of each row, `limit` rows from `offset` (default 20 from 0). */
export function page<T extends Record<string, unknown>>(
  rows: T[],
  columns: readonly string[] | null,
  limit = 20,
  offset = 0,
) {
  const slice = rows.slice(offset, offset + limit);
  return columns ? slice.map((row) => Object.fromEntries(columns.map((c) => [c, row[c] ?? null]))) : slice;
}

/** Markdown or Tiptap text to Tiptap JSON, or the error to return. */
export function tiptapOrError(content: string | undefined, format: string | undefined) {
  if (content === undefined) return { ok: true as const, value: undefined };
  try {
    return { ok: true as const, value: processContent(content, format) };
  } catch (e) {
    return { ok: false as const, error: `Failed to process content: ${e instanceof Error ? e.message : String(e)}` };
  }
}
