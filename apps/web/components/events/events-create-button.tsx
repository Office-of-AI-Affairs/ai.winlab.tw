"use client";

import { FloatingActionPill } from "@/components/shared/floating-action-pill";
import { insertRow } from "@/lib/actions/rows";
import { useT } from "@/lib/i18n/locale-provider";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function EventsCreateButton() {
  const t = useT();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    const tempSlug = `event-${Date.now()}`;
    const result = await insertRow("events", {
      name: "新活動",
      slug: tempSlug,
      description: null,
      cover_image: null,
      status: "draft",
      pinned: false,
      sort_order: 0,
    }).catch(() => null);
    if (!result?.ok) { toast.error(result?.error ?? t.common.createFailed); setIsCreating(false); return; }
    router.push(`/events/${result.row.slug}?mode=edit`);
  };

  return (
    <FloatingActionPill
      icon={Plus}
      label={isCreating ? t.common.creating : t.events.actions.newEvent}
      onClick={handleCreate}
      loading={isCreating}
    />
  );
}
