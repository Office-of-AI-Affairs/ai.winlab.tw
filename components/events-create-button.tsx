"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function EventsCreateButton() {
  const { user } = useAuth();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!user) return;
    setIsCreating(true);
    const supabase = createClient();
    const tempSlug = `event-${Date.now()}`;
    const { data, error } = await supabase
      .from("events")
      .insert({ name: "新活動", slug: tempSlug, description: null, cover_image: null, status: "draft", pinned: false, sort_order: 0 })
      .select()
      .single();
    if (error) { setIsCreating(false); return; }
    router.push(`/events/${data.slug}/edit`);
  };

  return (
    <Button variant="secondary" onClick={handleCreate} disabled={isCreating}>
      {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
      新增活動
    </Button>
  );
}
