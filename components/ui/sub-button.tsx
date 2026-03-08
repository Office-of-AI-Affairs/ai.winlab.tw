import { cn } from "@/lib/utils";
import Link from "next/link";
import * as React from "react";

type SubButtonProps = {
  href?: string;
  target?: string;
  rel?: string;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
};

function SubButton({ href, target, rel, onClick, className, children }: SubButtonProps) {
  const baseClass = cn(
    "flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors",
    className
  );

  if (href) {
    return (
      <Link href={href} target={target} rel={rel} className={baseClass}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={baseClass}>
      {children}
    </button>
  );
}

export { SubButton };
