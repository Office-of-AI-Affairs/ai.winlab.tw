"use client";

import { AppLink } from "@/components/app-link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type OwnedRecruitment = {
  id: string;
  title: string;
  image: string | null;
  event_slug: string;
  event_name: string;
};

type OwnerRow = {
  competition_id: string;
  competitions: {
    id: string;
    title: string;
    image: string | null;
    events: {
      slug: string;
      name: string;
    } | null;
  } | null;
};

export function VendorEventsSection() {
  const { user } = useAuth();
  const [recruitments, setRecruitments] = useState<OwnedRecruitment[] | null>(null);

  useEffect(() => {
    if (!user) return;
    async function fetchOwnedRecruitments() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("competition_owners")
        .select("competition_id, competitions(id, title, image, events(slug, name))")
        .eq("user_id", user!.id);
      if (error) { console.error("Failed to fetch owned recruitments:", error); toast.error("載入徵才失敗"); }
      const rows = ((data as unknown as OwnerRow[] | null) ?? [])
        .map((r) => r.competitions && r.competitions.events
          ? {
              id: r.competitions.id,
              title: r.competitions.title,
              image: r.competitions.image,
              event_slug: r.competitions.events.slug,
              event_name: r.competitions.events.name,
            }
          : null)
        .filter((r): r is OwnedRecruitment => r !== null);
      setRecruitments(rows);
    }
    fetchOwnedRecruitments();
  }, [user]);

  const loading = user !== null && recruitments === null;

  return (
    <div className="grid gap-3">
      <h2 className="text-lg font-semibold">我管理的徵才</h2>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-[2rem] border border-border overflow-hidden">
              <Skeleton className="aspect-video w-full" />
              <div className="p-4 grid gap-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : !recruitments || recruitments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          尚未被指派為任何徵才的擁有者
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recruitments.map((item) => (
            <AppLink
              key={item.id}
              href={`/events/${item.event_slug}/recruitment/${item.id}`}
              className="block interactive-scale"
            >
              <div className="rounded-[2rem] border border-border overflow-hidden">
                <div className="relative aspect-video w-full bg-muted">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-primary" />
                  )}
                </div>
                <div className="p-4 grid gap-2">
                  <p className="font-medium line-clamp-2">{item.title}</p>
                  <div>
                    <Badge variant="secondary">{item.event_name}</Badge>
                  </div>
                </div>
              </div>
            </AppLink>
          ))}
        </div>
      )}
    </div>
  );
}
