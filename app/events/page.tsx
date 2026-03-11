import { EventCard } from "@/components/event-card";
import { EventsCreateButton } from "@/components/events-create-button";
import { Block } from "@/components/ui/block";
import { SubButton } from "@/components/ui/sub-button";
import { createClient } from "@/lib/supabase/server";
import type { Event } from "@/lib/supabase/types";
import { ArrowLeftIcon } from "lucide-react";
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
    <div className="max-w-6xl mx-auto p-4 flex flex-col gap-4">

      <Block variant="ghost" className="flex items-center justify-between">
        <SubButton href="/">
          <ArrowLeftIcon className="size-4" /> 返回首頁
        </SubButton>
        {isAdmin && <EventsCreateButton />}
      </Block>

      <div className="w-full grid lg:grid-cols-3 gap-4">

        <div className="col-span-1">

          <Block className="flex flex-col gap-4">
            <h1 className="text-2xl text-foreground font-bold">活動專區</h1>
            <p className="text-muted-foreground">當前共有 {eventList.length} 場活動</p>
          </Block>

        </div>

        <div className="col-span-1 lg:col-span-2">

          {eventList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">目前沒有活動</div>
          ) : (
            <div className="grid gap-4">
              {eventList.map((item) => (
                <Link href={`/events/${item.slug}`} key={item.id} className="h-full">
                  <EventCard item={item} isAdmin={isAdmin} compact />
                </Link>
              ))}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
