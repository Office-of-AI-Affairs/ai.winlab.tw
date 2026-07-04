import sanitizeHtml from "sanitize-html"

// Tiptap content jsonb is written directly by the browser client (see
// hooks/use-content-editor.ts) with no server-side validation, so any user
// with write access to an article could hand-craft a document node that
// generateHTML() would happily turn into `<a href="javascript:...">`,
// `<img onerror=...>`, or a non-YouTube `<iframe>`. This is the main defense
// against that: sanitize the HTML generateHTML() produces before it reaches
// dangerouslySetInnerHTML (components/rich-text-surface.tsx). A conservative
// CSP is layered on top (next.config.ts) as defense-in-depth, not a
// replacement for this.
const YOUTUBE_DOMAINS = ["youtube.com", "youtube-nocookie.com", "youtu.be"]

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "a",
    "img",
    "strong",
    "em",
    "s",
    "code",
    "pre",
    "blockquote",
    "ul",
    "ol",
    "li",
    "br",
    "hr",
    "span",
    "div",
    "iframe",
  ],
  allowedAttributes: {
    a: ["href", "rel", "target"],
    img: ["src", "alt", "class", "width", "height"],
    iframe: ["src", "width", "height", "allowfullscreen", "class"],
    // Heading ids back the TOC (lib/ui/article.ts); code/pre/span classes
    // back lowlight syntax highlighting (lib/ui/lowlight.ts).
    h1: ["id"],
    h2: ["id"],
    h3: ["id"],
    h4: ["id"],
    h5: ["id"],
    h6: ["id"],
    code: ["class"],
    pre: ["class"],
    span: ["class"],
  },
  // Global scheme allowlist (applies to `a[href]` and anything else not
  // overridden below) — blocks javascript:/vbscript:/etc.
  allowedSchemes: ["http", "https", "mailto"],
  // img specifically also allows inline data: URIs (pasted/compressed
  // images can end up as data URIs); this list replaces allowedSchemes for
  // img, so http/https must be repeated here.
  allowedSchemesByTag: {
    img: ["http", "https", "data"],
  },
  // Only allow embedding YouTube. sanitize-html strips `src` from any
  // iframe whose hostname doesn't match; exclusiveFilter below then drops
  // the now-src-less iframe entirely instead of leaving a dead embed shell.
  allowedIframeDomains: YOUTUBE_DOMAINS,
  allowIframeRelativeUrls: false,
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        rel: "noopener nofollow",
        target: "_blank",
      },
    }),
  },
  exclusiveFilter: (frame) => {
    if (frame.tag === "iframe" && !frame.attribs.src) return true
    // Belt-and-suspenders: reject any data: image src that isn't actually
    // an image (allowedSchemesByTag already restricts the scheme to
    // http/https/data, this narrows "data:" further to image/*).
    if (frame.tag === "img" && frame.attribs.src?.startsWith("data:")) {
      return !frame.attribs.src.startsWith("data:image/")
    }
    return false
  },
}

/** Strip any HTML that generateHTML() could produce down to a safe allowlist. */
export function sanitizeRichTextHtml(html: string): string {
  return sanitizeHtml(html, sanitizeOptions)
}
