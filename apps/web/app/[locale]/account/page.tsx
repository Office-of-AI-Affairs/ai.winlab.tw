import { requireViewer } from "@/lib/auth/viewer";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const viewer = await requireViewer();
  redirect(`/profile/${viewer.id}`);
}
