import Link from "next/link";
import { OFFICE_NAME_EN, UNIVERSITY_NAME_EN } from "@/lib/site";
import { type Locale } from "@/lib/i18n/config";
import { localizedPath } from "@/lib/i18n/routing";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { FooterLanguageSwitch } from "@/components/layout/footer-language-switch";

export function Footer({ t, locale }: { t: Dictionary["footer"]; locale: Locale }) {
  const links: { href: string; label: string; external?: boolean; prefetch?: boolean }[] = [
    { href: "/introduction", label: t.organization },
    { href: "/announcement", label: t.announcement },
    { href: "/events", label: t.events },
    { href: "/privacy", label: t.privacy },
    { href: "/accessibility", label: t.accessibility },
    // Feed discovery (#46) — same per-locale feed the <head> alternate link
    // points to; /events/calendar.ics has no per-locale content difference
    // (events have no i18n body), but still routes through localizedPath
    // for a consistent /en/* URL shape. prefetch=false — these are route
    // handlers returning XML/ICS, not pages; viewport prefetching a footer
    // link on every page load would fire the query for nothing.
    { href: "/announcement/rss.xml", label: t.rss, prefetch: false },
    { href: "/events/calendar.ics", label: t.calendar, prefetch: false },
    { href: "https://www.winlab.tw", label: "WinLab", external: true },
  ];

  return (
    <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-8 w-full">
      <p className="text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} {UNIVERSITY_NAME_EN} &middot; {OFFICE_NAME_EN}
      </p>
      {links.map(({ href, label, external, prefetch }) =>
        external ? (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {label}
          </a>
        ) : (
          <Link
            key={href}
            href={localizedPath(href, locale)}
            prefetch={prefetch}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {label}
          </Link>
        )
      )}
      <FooterLanguageSwitch />
    </footer>
  );
}
