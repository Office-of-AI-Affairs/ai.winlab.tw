import { Slot } from "@radix-ui/react-slot"
import * as React from "react"

import { pageSectionVariants } from "@/lib/ui/patterns"
import { cn } from "@/lib/utils"

type PageSectionProps = React.ComponentProps<"div"> & {
  asChild?: boolean
  tone?: "home" | "content" | "admin"
}

function PageSection({
  asChild = false,
  className,
  tone = "content",
  ...props
}: PageSectionProps) {
  const Comp = asChild ? Slot : "div"

  return (
    <Comp
      data-slot="page-section"
      data-tone={tone}
      className={cn(pageSectionVariants({ tone }), className)}
      {...props}
    />
  )
}

export { PageSection }
