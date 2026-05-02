// Rich-text prose classes split out from rich-text.ts so that view-mode
// surfaces (RichTextSurface, AnnouncementDetail, etc.) can pull the class
// names without dragging the full Tiptap HTML extension bundle (lowlight,
// generateHTML, codeblock language packs) into the visitor JS chunk.

export const richTextDocumentClassName =
  "prose prose-sm sm:prose-base max-w-none [&_img]:pt-4 [&_h1]:scroll-mt-24 [&_h2]:scroll-mt-24 [&_h3]:scroll-mt-24 [&_h4]:scroll-mt-24"

export const editableRichTextDocumentClassName =
  `${richTextDocumentClassName} min-h-[360px] px-0 py-6 sm:py-8 focus:outline-none`
