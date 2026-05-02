import TiptapImage from "@tiptap/extension-image"
import { Heading } from "@tiptap/extension-heading"
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight"
import Youtube from "@tiptap/extension-youtube"
import { generateHTML } from "@tiptap/html"
import StarterKit from "@tiptap/starter-kit"
import type { JSONContent } from "@tiptap/core"
import { processArticle, type TocItem } from "./article"
import { lowlight } from "./lowlight"

export {
  richTextDocumentClassName,
  editableRichTextDocumentClassName,
} from "./rich-text-classes"

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
  StarterKit.configure({ heading: false, codeBlock: false }),
  HeadingWithId,
  CodeBlockLowlight.configure({
    lowlight,
    HTMLAttributes: { class: "rounded-lg" },
  }),
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
