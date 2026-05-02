"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  /** Path or full URL to share */
  url: string;
  title: string;
  className?: string;
};

const SITE_BASE = "https://ai.winlab.tw";

export function ShareButtons({ url, title, className }: Props) {
  const [copied, setCopied] = useState(false);
  const fullUrl = url.startsWith("http") ? url : `${SITE_BASE}${url.startsWith("/") ? url : `/${url}`}`;

  async function handleShare() {
    // On mobile (and any browser exposing the Web Share API) try the native
    // share sheet first — that's where LINE / Messages / AirDrop live, much
    // better UX than copy-paste. On desktop browsers `navigator.share` is
    // typically undefined, so we fall through to clipboard copy.
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ url: fullUrl, title });
        return;
      } catch (err) {
        // AbortError = user dismissed the sheet, treat as success-no-action.
        if (err instanceof Error && err.name === "AbortError") return;
        // Anything else: fall through and try clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success("已複製連結");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("複製失敗，請手動複製網址列");
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={copied ? "已複製連結" : "分享連結"}
      className={cn(
        "inline-flex items-center justify-center size-8 rounded-full border border-border text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
    </button>
  );
}
