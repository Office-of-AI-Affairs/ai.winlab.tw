import type { ReactNode } from "react";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  panelClassName?: string;
};

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
  panelClassName,
}: AuthShellProps) {
  return (
    <main className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4 py-12 md:py-16">
      <div className={["w-full max-w-md flex flex-col gap-6", panelClassName].filter(Boolean).join(" ")}>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">{eyebrow}</p>
          <h1 className="text-3xl font-bold mt-2">{title}</h1>
          <p className="text-muted-foreground mt-2">{description}</p>
        </div>
        {children}
        {footer ? <div>{footer}</div> : null}
      </div>
    </main>
  );
}
