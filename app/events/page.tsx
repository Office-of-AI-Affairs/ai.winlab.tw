import { EventCard } from "@/components/event-card";
import { EventsCreateButton } from "@/components/events-create-button";
import { createClient } from "@/lib/supabase/server";
import type { Event } from "@/lib/supabase/types";
import Link from "next/link";

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    isAdmin = profile?.role === "admin";
  }

  const query = supabase
    .from("events")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (!user) query.eq("status", "published");
  const { data: events } = await query;
  const eventList = (events as Event[]) ?? [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">活動專區</h1>
        {isAdmin && <EventsCreateButton />}
      </div>

      {eventList.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">目前沒有活動</div>
      ) : (
        <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-6">
          {eventList.map((item) => (
            <Link href={`/events/${item.slug}`} key={item.id} className="h-full">
              <EventCard item={item} isAdmin={isAdmin} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
