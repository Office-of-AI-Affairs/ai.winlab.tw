"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";

export function IntroductionEditButton() {
  const { isAdmin } = useAuth();
  const router = useRouter();

  if (!isAdmin) return null;

  return (
    <Button variant="secondary" onClick={() => router.push("/introduction/edit")}>
      <Pencil className="w-4 h-4" />
      編輯
    </Button>
  );
}
