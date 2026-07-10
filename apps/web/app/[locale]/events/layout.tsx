import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "活動專區｜人工智慧專責辦公室",
  description: "國立陽明交通大學人工智慧專責辦公室舉辦的各項活動。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
