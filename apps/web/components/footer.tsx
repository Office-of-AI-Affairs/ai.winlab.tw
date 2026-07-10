import Link from "next/link";
import { OFFICE_NAME_EN, UNIVERSITY_NAME_EN } from "@/lib/site";

const FOOTER_LINKS: { href: string; label: string; external?: boolean }[] = [
  { href: "/introduction", label: "組織" },
  { href: "/announcement", label: "公告" },
  { href: "/events", label: "活動" },
  { href: "/privacy", label: "隱私權" },
  { href: "https://www.winlab.tw", label: "WinLab", external: true },
];

export function Footer() {
  return (
    <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-8 w-full">
      <p className="text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} {UNIVERSITY_NAME_EN} &middot; {OFFICE_NAME_EN}
      </p>
      {FOOTER_LINKS.map(({ href, label, external }) =>
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
            href={href}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {label}
          </Link>
        )
      )}
    </footer>
  );
}
