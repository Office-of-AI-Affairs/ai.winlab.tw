import { Slot } from "@radix-ui/react-slot"
import * as React from "react"

import { pageShellVariants } from "@/lib/ui/patterns"
import { cn } from "@/lib/utils"

type PageShellProps = React.ComponentProps<"div"> & {
  asChild?: boolean
  tone?:
    | "content"
    | "dashboard"
    | "admin"
    | "editor"
    | "auth"
    | "profile"
}

function PageShell({
  asChild = false,
  className,
  tone = "content",
  ...props
}: PageShellProps) {
  const Comp = asChild ? Slot : "div"

  return (
    <Comp
      data-slot="page-shell"
      data-tone={tone}
      className={cn(pageShellVariants({ tone }), className)}
      {...props}
    />
  )
}

export { PageShell }
