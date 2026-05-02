"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  /** Delay (ms) before the reveal kicks in, useful to stagger sibling sections. */
  delay?: number;
  className?: string;
};

/**
 * One-shot scroll-into-view fade + rise. Element starts at opacity 0 and
 * +24px below its resting position; once 10% of it intersects the viewport
 * the IntersectionObserver fires, we flip a flag, and CSS handles the
 * transition. Disconnects after the first reveal so we don't keep paying
 * observer cost as the page scrolls.
 *
 * Tailwind catch-all transitions are banned by patterns.test, so we list
 * the two animated properties explicitly.
 */
export function Reveal({ children, delay = 0, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        if (delay > 0) {
          setTimeout(() => setVisible(true), delay);
        } else {
          setVisible(true);
        }
        observer.disconnect();
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={cn(
        // Tailwind's motion-reduce: variants snap the element straight to its
        // final state when the OS asks for less motion — no synchronous
        // setState gymnastics in the effect, no flicker.
        "transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none",
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-6 motion-reduce:opacity-100 motion-reduce:translate-y-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
