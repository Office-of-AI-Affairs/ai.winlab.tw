"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import Link from "next/link";

export function IntroductionEditButton() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return null;

  return (
    <Button variant="secondary" asChild>
      <Link href="/introduction/edit">
      <Pencil className="w-4 h-4" />
      編輯
      </Link>
    </Button>
  );
}
