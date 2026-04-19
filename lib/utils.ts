import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { toCdnUrl } from "@/lib/cdn"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const IMAGE_PLACEHOLDER_DATA_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 675'%3E%3Crect width='1200' height='675' fill='%23e5e7eb'/%3E%3Cpath d='M0 520L220 340l175 140 185-220 235 235 120-95 265 120V675H0V520Z' fill='%23cbd5e1'/%3E%3Ccircle cx='930' cy='180' r='72' fill='%23f8fafc'/%3E%3C/svg%3E"

export function resolveImageSrc(src: string | null | undefined): string {
  if (!src || src === "/placeholder.png") {
    return IMAGE_PLACEHOLDER_DATA_URL
  }

  return toCdnUrl(src) ?? src
}

export function hasCustomImage(src: string | null | undefined): boolean {
  return Boolean(src && src !== "/placeholder.png" && src !== IMAGE_PLACEHOLDER_DATA_URL)
}

export function isExternalImage(src: string | null | undefined): boolean {
  return !!(src && (src.startsWith("http://") || src.startsWith("https://")));
}
