import TiptapImage from "@tiptap/extension-image"
import Youtube from "@tiptap/extension-youtube"
import { generateHTML } from "@tiptap/html"
import StarterKit from "@tiptap/starter-kit"
import type { JSONContent } from "@tiptap/core"

export const richTextDocumentClassName =
  "prose prose-sm sm:prose-base max-w-none [&_img]:pt-4"

export const editableRichTextDocumentClassName =
  `${richTextDocumentClassName} min-h-[360px] px-0 py-6 sm:py-8 focus:outline-none`

export const richTextHtmlExtensions = [
  StarterKit,
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

  return generateHTML(content as JSONContent, richTextHtmlExtensions)
}
