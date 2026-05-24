"use client"

import dynamic from "next/dynamic"

// `sonner` ships ~9 KB gz of toast runtime that visitors never trigger
// (no mutations without auth). Defer the entire bundle behind a client
// dynamic import so the root layout stays static-friendly and the chunk
// is only fetched when this client island actually mounts in the browser.
const Toaster = dynamic(
  () => import("@/components/ui/sonner").then((m) => ({ default: m.Toaster })),
  { ssr: false },
)

export function LazyToaster() {
  return <Toaster />
}
