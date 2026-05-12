import Link from "next/link"
import * as React from "react"

import { getAutoLinkProps } from "@/lib/ui/patterns"
import { cn } from "@/lib/utils"

type AppLinkProps = React.ComponentProps<typeof Link> & {
  interactive?: boolean
}

function AppLink({
  className,
  href,
  interactive = true,
  rel,
  target,
  ...props
}: AppLinkProps) {
  const autoProps = typeof href === "string" ? getAutoLinkProps(href) : {}

  return (
    <Link
      data-slot="app-link"
      href={href}
      className={cn(
        interactive && "interactive-scale transition-colors duration-200",
        className
      )}
      rel={rel ?? autoProps.rel}
      target={target ?? autoProps.target}
      {...props}
    />
  )
}

export { AppLink }
