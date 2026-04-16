import { cva } from "class-variance-authority"

export function getAutoLinkProps(href: string) {
  if (/^https?:\/\//.test(href)) {
    return {
      target: "_blank",
      rel: "noopener noreferrer",
    }
  }

  return {}
}

export const pageSectionVariants = cva("w-full", {
  variants: {
    tone: {
      home: "page-section-home",
      content: "page-section-content",
      admin: "page-section-admin",
    },
  },
  defaultVariants: {
    tone: "content",
  },
})

export const pageShellVariants = cva("w-full", {
  variants: {
    tone: {
      content: "max-w-6xl mx-auto px-4 py-12 flex flex-col gap-8",
      dashboard: "max-w-6xl mx-auto p-4 flex flex-col gap-4",
      admin: "max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8",
      editor: "max-w-6xl mx-auto px-4 flex flex-col mt-8 pb-16",
      auth: "min-h-[calc(100vh-10rem)] flex items-center justify-center px-4 py-12 md:py-16",
      profile: "max-w-6xl w-full",
    },
  },
  defaultVariants: {
    tone: "content",
  },
})
