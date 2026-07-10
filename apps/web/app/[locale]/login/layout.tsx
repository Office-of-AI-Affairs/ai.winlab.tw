import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "登入｜人工智慧專責辦公室",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
