import Link from "next/link";

export function Footer() {
  return (
    <footer className="flex items-center justify-center gap-4 py-8 w-full">
      <p className="text-sm font-bold text-muted-foreground" style={{ fontFamily: "var(--font-instrument-serif)" }}>
        Copyright &copy; {new Date().getFullYear()} AI Office. All rights reserved.
      </p>
      <Link
        href="/privacy"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        隱私權政策
      </Link>
    </footer>
  );
}
