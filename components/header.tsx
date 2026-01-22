"use client";

import { useAuth } from "@/components/auth-provider";
import { Separator } from "@/components/ui/separator";
import { Loader2, TextAlignJustify } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const navItems = [
  { href: "/introduction", label: "簡介" },
  { href: "/announcement", label: "公告" },
  { href: "/result", label: "成果" },
  { href: "/competition", label: "競賽" },
];

export function Header() {
  const { user, isLoading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const panel = panelRef.current;
      const btn = buttonRef.current;
      const target = e.target as Node;

      if (panel?.contains(target)) return;
      if (btn?.contains(target)) return;

      setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const renderAuthSection = (isMobile = false) => {
    if (user) {
      return (
        <div className={isMobile ? "flex flex-col" : "flex items-center gap-4"}>
          {isMobile && <Separator className="my-2" />}
          <span className={isMobile ? "rounded-lg px-3 py-2 text-muted-foreground" : "text-sm text-muted-foreground"}>
            {user.email}
          </span>
          <button
            type="button"
            onClick={() => {
              signOut();
              if (isMobile) setOpen(false);
            }}
            className={isMobile ? "rounded-lg px-3 py-2 hover:bg-black/5 text-left" : "hover:opacity-80 cursor-pointer"}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "登出"}
          </button>
        </div>
      );
    }

    return (
      <Link
        href="/login"
        className={isMobile ? "rounded-lg px-3 py-2 hover:bg-black/5" : "hover:opacity-80"}
        onClick={isMobile ? () => setOpen(false) : undefined}
      >
        登入
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-6">
        <Link href="/" className="text-xl sm:text-2xl font-bold whitespace-nowrap">
          NYCU AI 專責辦公室
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:opacity-80">
              {item.label}
            </Link>
          ))}
          {renderAuthSection()}
        </nav>

        <button
          ref={buttonRef}
          type="button"
          className="md:hidden inline-flex items-center justify-center rounded-lg p-2 hover:bg-black/5"
          aria-label="開啟選單"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Menu</span>
          <TextAlignJustify />
        </button>
      </div>

      <div
        id="mobile-menu"
        className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-200 ${open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
      >
        <div ref={panelRef} className="max-w-7xl mx-auto px-4 pb-4">
          <div className="flex flex-col">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 hover:bg-black/5"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            {renderAuthSection(true)}
          </div>
        </div>
      </div>
    </header>
  );
}