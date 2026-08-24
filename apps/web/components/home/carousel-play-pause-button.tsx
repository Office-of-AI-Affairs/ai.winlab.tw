"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Pause, Play } from "lucide-react";

/**
 * Visible, keyboard-operable pause/resume control for the hero carousel's
 * autoplay (WCAG 2.2.2 Pause, Stop, Hide). Unlike `CarouselPrevious`/
 * `CarouselNext` this never fades to `opacity-0` on idle — a pause control
 * that only reveals itself on hover isn't discoverable by someone who wants
 * to stop the motion before it starts.
 */
export function CarouselPlayPauseButton({
  paused,
  onToggle,
  pauseLabel,
  playLabel,
  className,
}: {
  paused: boolean;
  onToggle: () => void;
  pauseLabel: string;
  playLabel: string;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onToggle}
      aria-pressed={paused}
      aria-label={paused ? playLabel : pauseLabel}
      className={cn(
        "h-10 w-10 rounded-full border-none bg-black/30 text-white hover:bg-black/50",
        className,
      )}
    >
      {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
    </Button>
  );
}
