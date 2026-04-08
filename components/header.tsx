"use client";

import { AppLink } from "@/components/app-link";
import { useAuth } from "@/components/auth-provider";
import { Loader2, TextAlignJustify } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const staticNavItems = [
  { href: "/introduction", label: "關於" },
  { href: "/organization", label: "組織" },
  { href: "/announcement", label: "公告" },
];

export function Header({ pinnedEvents }: { pinnedEvents: { name: string; slug: string }[] }) {
  const { user, profile, isLoading, signOut, isAdmin } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href));
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
    const profileHref = user ? `/profile/${user.id}` : "/account";
    const profileActive = isActive(profileHref);
    const profileClass = isMobile
      ? `interactive-scale rounded-lg px-3 py-2 hover:bg-black/10 text-left w-full ${profileActive ? "bg-black/15" : ""}`
      : `interactive-scale nav-bracket inline-block ${profileActive ? "nav-bracket-active" : ""}`;
    const btnClass = isMobile
      ? "interactive-scale rounded-lg px-3 py-2 hover:bg-black/10 text-left w-full"
      : "interactive-scale nav-bracket inline-block cursor-pointer";

    if (user) {
      const displayLabel = profile?.display_name || user.email || "帳號";
      return (
        <div
          className={
            isMobile ? "flex flex-col" : "flex items-center gap-8"
          }
        >
          <AppLink
            href={profileHref}
            className={profileClass}
            onClick={isMobile ? () => setOpen(false) : undefined}
          >
            {displayLabel}
          </AppLink>
          <button
            type="button"
            onClick={() => {
              signOut();
              if (isMobile) setOpen(false);
            }}
            className={btnClass}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "登出"
            )}
          </button>
        </div>
      );
    }

    return (
      <AppLink
        href="/login"
        className={btnClass}
        onClick={isMobile ? () => setOpen(false) : undefined}
      >
        登入
      </AppLink>
    );
  };

  return (
    <header className="sticky top-0 z-50 bg-nycu text-white">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6 text-xl font-bold">
        <AppLink href="/" className="inline-block text-2xl tracking-widest">
          人工智慧專責辦公室
        </AppLink>

        <nav className="hidden min-[1152px]:flex items-center gap-8 text-lg">
          {staticNavItems.map((item) => (
            <AppLink key={item.href} href={item.href} className={`nav-bracket inline-block ${isActive(item.href) ? "nav-bracket-active" : ""}`}>
              {item.label}
            </AppLink>
          ))}
          <AppLink href="/events" className={`nav-bracket inline-block ${isActive("/events") ? "nav-bracket-active" : ""}`}>
            活動
          </AppLink>
          {pinnedEvents.map((event) => (
            <AppLink key={event.slug} href={`/events/${event.slug}`} className={`nav-bracket inline-block ${isActive(`/events/${event.slug}`) ? "nav-bracket-active" : ""}`}>
              {event.name}
            </AppLink>
          ))}
          {isAdmin && (
            <AppLink href="/settings" className={`nav-bracket inline-block ${isActive("/settings") ? "nav-bracket-active" : ""}`}>
              設定
            </AppLink>
          )}
          {renderAuthSection()}
        </nav>

        <button
          ref={buttonRef}
          type="button"
          className="interactive-scale min-[1152px]:hidden inline-flex items-center justify-center rounded-lg p-2 hover:bg-black/10"
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
        className={`min-[1152px]:hidden overflow-hidden transition-[max-height,opacity] duration-200 ${open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
      >
        <div ref={panelRef} className="max-w-6xl mx-auto px-4 pb-4">
          <div className="flex flex-col text-lg font-bold">
            {staticNavItems.map((item) => (
              <AppLink
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 hover:bg-black/10 ${isActive(item.href) ? "bg-black/15" : ""}`}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </AppLink>
            ))}
            <AppLink
              href="/events"
              className={`rounded-lg px-3 py-2 hover:bg-black/10 ${isActive("/events") ? "bg-black/15" : ""}`}
              onClick={() => setOpen(false)}
            >
              活動
            </AppLink>
            {pinnedEvents.map((event) => (
              <AppLink
                key={event.slug}
                href={`/events/${event.slug}`}
                className={`rounded-lg px-3 py-2 hover:bg-black/10 ${isActive(`/events/${event.slug}`) ? "bg-black/15" : ""}`}
                onClick={() => setOpen(false)}
              >
                {event.name}
              </AppLink>
            ))}
            {isAdmin && (
              <AppLink
                href="/settings"
                className={`rounded-lg px-3 py-2 hover:bg-black/10 ${isActive("/settings") ? "bg-black/15" : ""}`}
                onClick={() => setOpen(false)}
              >
                設定
              </AppLink>
            )}
            {renderAuthSection(true)}
          </div>
        </div>
      </div>
    </header>
  );
}
