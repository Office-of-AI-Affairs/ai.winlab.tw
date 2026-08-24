"use client"

import Link from "next/link"
import * as React from "react"

import { useLocale } from "@/lib/i18n/locale-provider"
import { localizedPath } from "@/lib/i18n/routing"
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
  const locale = useLocale()
  const autoProps = typeof href === "string" ? getAutoLinkProps(href) : {}
  // Prefix internal absolute paths with the active locale (`/en/...`); the
  // default locale is un-prefixed. External/mailto/tel/hash hrefs pass through.
  const localizedHref = typeof href === "string" ? localizedPath(href, locale) : href

  return (
    <Link
      data-slot="app-link"
      href={localizedHref}
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
