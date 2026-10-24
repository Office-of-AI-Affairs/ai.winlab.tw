"use client";

import { Button } from "@/components/ui/button";
import { oauthAuthClient } from "@/lib/auth/oauth-client";
import { useT } from "@/lib/i18n/locale-provider";
import { useState } from "react";
import { toast } from "sonner";

export function ConsentActions() {
  const t = useT().auth.consent;
  const [pending, setPending] = useState<"allow" | "deny" | null>(null);

  async function answer(accept: boolean) {
    setPending(accept ? "allow" : "deny");
    const { data, error } = await oauthAuthClient.oauth2.consent({ accept });
    if (error || !data?.url) {
      setPending(null);
      toast.error(error?.message ?? t.failed);
      return;
    }
    window.location.href = data.url;
  }

  return (
    <div className="flex gap-3">
      <Button variant="outline" className="flex-1" disabled={pending !== null} onClick={() => answer(false)}>
        {pending === "deny" ? t.denying : t.deny}
      </Button>
      <Button className="flex-1" disabled={pending !== null} onClick={() => answer(true)}>
        {pending === "allow" ? t.allowing : t.allow}
      </Button>
    </div>
  );
}
