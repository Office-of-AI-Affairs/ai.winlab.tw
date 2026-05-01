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
  const enc = encodeURIComponent;

  const links = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(fullUrl)}`,
    x: `https://twitter.com/intent/tweet?url=${enc(fullUrl)}&text=${enc(title)}`,
    line: `https://social-plugins.line.me/lineit/share?url=${enc(fullUrl)}`,
  };

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

  const baseBtn =
    "inline-flex items-center justify-center size-8 rounded-full border border-border text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className={cn("flex items-center gap-2", className)} aria-label="分享">
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "已複製連結" : "複製連結"}
        className={baseBtn}
      >
        {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
      </button>
      <a
        href={links.facebook}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="分享到 Facebook"
        className={cn(baseBtn, "text-[10px] font-bold")}
      >
        f
      </a>
      <a
        href={links.x}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="分享到 X"
        className={cn(baseBtn, "text-[11px] font-bold")}
      >
        𝕏
      </a>
      <a
        href={links.line}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="分享到 LINE"
        className={cn(baseBtn, "text-[9px] font-bold tracking-tight")}
      >
        LINE
      </a>
    </div>
  );
}
