"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

const sections = [
  { id: "colors", label: "色彩" },
  { id: "typography", label: "字型" },
  { id: "spacing", label: "間距與圓角" },
  { id: "components", label: "元件" },
  { id: "patterns", label: "模式" },
];

export function DesignSidebar() {
  const [activeId, setActiveId] = useState(sections[0].id);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const topmost = visible.reduce((a, b) =>
            a.boundingClientRect.top < b.boundingClientRect.top ? a : b,
          );
          setActiveId(topmost.target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 },
    );

    for (const { id } of sections) {
      const el = document.getElementById(id);
      if (el) observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, []);

  function handleClick(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      setActiveId(id);
    }
  }

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden lg:block sticky top-20 self-start w-56 shrink-0">
        <ul className="flex flex-col gap-1">
          {sections.map(({ id, label }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => handleClick(id)}
                className={cn(
                  "w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors duration-200",
                  activeId === id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile horizontal nav */}
      <nav className="lg:hidden sticky top-16 z-10 -mx-4 bg-background/95 backdrop-blur border-b px-4 py-2 overflow-x-auto">
        <ul className="flex gap-4 min-w-max">
          {sections.map(({ id, label }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => handleClick(id)}
                className={cn(
                  "text-sm whitespace-nowrap pb-1 transition-colors duration-200",
                  activeId === id
                    ? "text-primary font-medium border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
