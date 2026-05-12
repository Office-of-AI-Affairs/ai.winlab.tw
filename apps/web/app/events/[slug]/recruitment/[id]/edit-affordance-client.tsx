"use client"

import { EditModeToggle } from "@/components/edit-mode-toggle"
import { RecruitmentDialog } from "@/components/recruitment-dialog"
import type { Recruitment } from "@/lib/supabase/types"
import { useRouter } from "next/navigation"
import { useState } from "react"

type Props = {
  recruitment: Recruitment
  eventId: string
}

/**
 * Floating "編輯" pill on the recruitment detail page. Mirrors the
 * inline view+edit affordance privacy / announcement / result use, but
 * delegates to the existing RecruitmentDialog because recruitment is
 * structured form data (positions / application method / contact / owners),
 * not a Tiptap document. After the dialog closes we refresh so the
 * detail page reflects the saved state immediately.
 */
export function RecruitmentEditAffordance({ recruitment, eventId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <>
      <EditModeToggle onClick={() => setOpen(true)} />
      <RecruitmentDialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value)
          if (!value) router.refresh()
        }}
        recruitment={recruitment}
        eventId={eventId}
      />
    </>
  )
}
