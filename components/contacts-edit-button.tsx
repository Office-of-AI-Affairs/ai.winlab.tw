import { Button } from "@/components/ui/button";
import Link from "next/link";

export function ContactsEditButton({ isAdmin }: { isAdmin: boolean }) {
  if (!isAdmin) return null;
  return (
    <Button variant="secondary" size="sm" asChild className="h-8 px-3">
      <Link href="/contacts">編輯聯絡資訊</Link>
    </Button>
  );
}
