import TiptapImage from "@tiptap/extension-image"
import { Heading } from "@tiptap/extension-heading"
import Youtube from "@tiptap/extension-youtube"
import { generateHTML } from "@tiptap/html"
import StarterKit from "@tiptap/starter-kit"
import type { JSONContent } from "@tiptap/core"
import { processArticle, type TocItem } from "./article"

export const richTextDocumentClassName =
  "prose prose-sm sm:prose-base max-w-none [&_img]:pt-4 [&_h1]:scroll-mt-24 [&_h2]:scroll-mt-24 [&_h3]:scroll-mt-24 [&_h4]:scroll-mt-24"

export const editableRichTextDocumentClassName =
  `${richTextDocumentClassName} min-h-[360px] px-0 py-6 sm:py-8 focus:outline-none`

// Default StarterKit heading drops unknown attrs; extend it so the slug `id`
// we inject in processArticle survives into the HTML.
const HeadingWithId = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: (el) => el.getAttribute("id"),
        renderHTML: (attrs) => (attrs.id ? { id: attrs.id } : {}),
      },
    }
  },
})

const richTextHtmlExtensions = [
  StarterKit.configure({ heading: false }),
  HeadingWithId,
  TiptapImage.configure({
    HTMLAttributes: {
      class: "rounded-lg max-w-full h-auto",
    },
  }),
  Youtube.configure({
    width: 640,
    height: 360,
    HTMLAttributes: {
      class: "rounded-lg w-full aspect-video",
    },
  }),
]

export function renderRichTextHtml(content: JSONContent | Record<string, unknown> | null | undefined) {
  if (!content || Object.keys(content).length === 0) {
    return null
  }
  const { contentWithIds } = processArticle(content)
  if (!contentWithIds) return null
  return generateHTML(contentWithIds, richTextHtmlExtensions)
}

export function renderArticle(
  content: JSONContent | Record<string, unknown> | null | undefined,
): { html: string | null; toc: TocItem[] } {
  if (!content || Object.keys(content).length === 0) {
    return { html: null, toc: [] }
  }
  const { contentWithIds, toc } = processArticle(content)
  if (!contentWithIds) return { html: null, toc }
  return { html: generateHTML(contentWithIds, richTextHtmlExtensions), toc }
}
