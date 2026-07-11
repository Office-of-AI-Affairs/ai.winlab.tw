"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-provider";
import Link from "next/link";

export function ContactsEditButton() {
  const { isAdmin } = useAuth();
  const t = useT();
  if (!isAdmin) return null;
  return (
    <Button variant="secondary" size="sm" asChild className="h-8 px-3">
      <Link href="/contacts">{t.contacts.editButton}</Link>
    </Button>
  );
}
