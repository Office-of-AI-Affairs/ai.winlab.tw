"use client"

import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import type { EditorUploadFn } from "@/components/tiptap-editor-shared"
import { useT } from "@/lib/i18n/locale-provider"
import { richTextDocumentClassName } from "@/lib/ui/rich-text-classes"

const TiptapEditor = dynamic(
  () => import("./tiptap-editor").then((m) => ({ default: m.TiptapEditor })),
  {
    ssr: false,
    loading: () => (
      <div data-slot="rich-text-surface-loading" className="flex flex-col gap-2 py-6">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    ),
  },
)

type Props = {
  /** Tiptap document JSON. Used as Tiptap's source when editing. */
  content: Record<string, unknown> | null
  /** Server-rendered HTML for view mode. Falls back to empty state when null. */
  contentHtml: string | null
  /** Whether to render the live Tiptap editor instead of static HTML. */
  editing: boolean
  /** Tiptap onChange — required when editing. */
  onChange?: (content: Record<string, unknown>) => void
  /** Empty-state copy when both content and contentHtml are missing in view mode. */
  emptyText?: string
  /** Upload function for embedded images. Picks the storage prefix that gates RLS. Defaults to admin-only announcement bucket prefix. */
  uploadFn?: EditorUploadFn
}

export function RichTextSurface({
  content,
  contentHtml,
  editing,
  onChange,
  emptyText,
  uploadFn,
}: Props) {
  const t = useT()
  if (editing) {
    return (
      <div data-slot="rich-text-surface" data-mode="edit">
        <TiptapEditor
          content={content ?? {}}
          onChange={(c) => onChange?.(c)}
          flush
          uploadFn={uploadFn}
        />
      </div>
    )
  }

  if (contentHtml) {
    return (
      <div
        data-slot="rich-text-surface"
        data-mode="view"
        className={richTextDocumentClassName}
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    )
  }

  return (
    <p data-slot="rich-text-surface" data-mode="empty" className="text-muted-foreground">
      {emptyText ?? t.common.noContent}
    </p>
  )
}
