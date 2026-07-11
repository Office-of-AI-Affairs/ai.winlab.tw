"use client";

import { FloatingActionPill } from "@/components/floating-action-pill";
import { createClient } from "@/lib/supabase/client";
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
    const supabase = createClient();
    const tempSlug = `event-${Date.now()}`;
    const { data, error } = await supabase
      .from("events")
      .insert({
        name: "新活動",
        slug: tempSlug,
        description: null,
        cover_image: null,
        status: "draft",
        pinned: false,
        sort_order: 0,
      })
      .select()
      .single();
    if (error) { toast.error(error.message ?? t.common.createFailed); setIsCreating(false); return; }
    router.push(`/events/${data.slug}?mode=edit`);
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
