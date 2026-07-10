import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "最新公告｜人工智慧專責辦公室",
  description: "國立陽明交通大學人工智慧專責辦公室最新公告與消息。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
