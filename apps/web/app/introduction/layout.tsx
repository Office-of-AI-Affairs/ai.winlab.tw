import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "組織｜人工智慧專責辦公室",
  description: "認識國立陽明交通大學人工智慧專責辦公室的定位、任務與組織成員。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
