"use client";

import { AppLink } from "@/components/app-link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { useEffect, useState } from "react";

type EventInfo = {
  id: string;
  name: string;
  slug: string;
  cover_image: string | null;
  status: string;
};

type VendorEvent = {
  event_id: string;
  events: EventInfo | null;
};

export function VendorEventsSection() {
  const { user } = useAuth();
  // null = not yet fetched, array = fetched (possibly empty)
  const [events, setEvents] = useState<VendorEvent[] | null>(null);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from("event_vendors")
      .select("event_id, events(id, name, slug, cover_image, status)")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setEvents((data as unknown as VendorEvent[]) ?? []);
      });
  }, [user]);

  const loading = user !== null && events === null;

  return (
    <div className="grid gap-3">
      <h2 className="text-lg font-semibold">我管理的活動</h2>

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
      ) : !events || events.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          尚未被分配到任何活動
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map(({ event_id, events: event }) => {
            if (!event) return null;
            return (
              <AppLink
                key={event_id}
                href={`/events/${event.slug}`}
                className="block interactive-scale"
              >
                <div className="rounded-[2rem] border border-border overflow-hidden">
                  <div className="relative aspect-video w-full bg-muted">
                    {event.cover_image ? (
                      <Image
                        src={event.cover_image}
                        alt={event.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full bg-primary" />
                    )}
                  </div>
                  <div className="p-4 grid gap-2">
                    <p className="font-medium line-clamp-2">{event.name}</p>
                    <div>
                      {event.status === "published" ? (
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                          已發布
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200">
                          草稿
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </AppLink>
            );
          })}
        </div>
      )}
    </div>
  );
}
