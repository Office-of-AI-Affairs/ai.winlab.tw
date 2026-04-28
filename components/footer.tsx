import Link from "next/link";

const FOOTER_LINKS: { href: string; label: string }[] = [
  { href: "/introduction", label: "組織" },
  { href: "/announcement", label: "公告" },
  { href: "/events", label: "活動" },
  { href: "/privacy", label: "隱私權" },
];

export function Footer() {
  return (
    <footer className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 py-8 w-full">
      <p className="text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Office of AI Affairs.
      </p>
      {FOOTER_LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {label}
        </Link>
      ))}
    </footer>
  );
}
