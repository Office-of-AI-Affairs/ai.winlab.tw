import Link from "next/link";

export function Footer() {
  return (
    <footer className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 py-8 w-full">
      <p className="text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Office of AI Affairs.
      </p>
      <Link
        href="/privacy"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Privacy
      </Link>
      <Link
        href="/design"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Design
      </Link>
    </footer>
  );
}
