import type { JSONContent } from "@tiptap/core"

export type TocItem = { id: string; level: number; text: string }

function getNodeText(node: JSONContent): string {
  if (node.type === "text") return node.text ?? ""
  if (!node.content) return ""
  return node.content.map(getNodeText).join("")
}

function slugify(text: string, fallback: string): string {
  const cleaned = text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w一-鿿-]/g, "")
  return cleaned || fallback
}

/**
 * Walk a Tiptap document, attach `attrs.id` to every heading (slugified from
 * its text), and collect a flat TOC. Single pass so the rendered HTML and the
 * sidebar agree on every id without re-walking.
 */
export function processArticle(
  content: JSONContent | Record<string, unknown> | null | undefined,
): { contentWithIds: JSONContent | null; toc: TocItem[] } {
  if (!content || Object.keys(content).length === 0) {
    return { contentWithIds: null, toc: [] }
  }
  const seen = new Map<string, number>()
  const toc: TocItem[] = []
  let headingIndex = 0

  function walk(node: JSONContent): JSONContent {
    if (node.type === "heading") {
      const text = getNodeText(node).trim()
      const base = slugify(text, `section-${headingIndex}`)
      const count = seen.get(base) ?? 0
      seen.set(base, count + 1)
      const id = count === 0 ? base : `${base}-${count}`
      const level = (node.attrs?.level as number | undefined) ?? 1
      headingIndex += 1
      toc.push({ id, level, text })
      return {
        ...node,
        attrs: { ...(node.attrs ?? {}), id },
        content: node.content?.map(walk),
      }
    }
    if (node.content) {
      return { ...node, content: node.content.map(walk) }
    }
    return node
  }

  return { contentWithIds: walk(content as JSONContent), toc }
}
