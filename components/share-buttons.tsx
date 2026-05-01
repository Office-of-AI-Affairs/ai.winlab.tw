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

export function ShareButtons({ url, title: _title, className }: Props) {
  const [copied, setCopied] = useState(false);
  const fullUrl = url.startsWith("http") ? url : `${SITE_BASE}${url.startsWith("/") ? url : `/${url}`}`;

  async function handleCopy() {
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
      onClick={handleCopy}
      aria-label={copied ? "已複製連結" : "複製連結"}
      className={cn(
        "inline-flex items-center justify-center size-8 rounded-full border border-border text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
    </button>
  );
}
