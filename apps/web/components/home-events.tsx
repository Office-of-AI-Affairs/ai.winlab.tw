import { getFeaturedEvents } from "@/app/events/data";
import { EventCard } from "@/components/event-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export async function HomeEvents() {
  const events = await getFeaturedEvents();

  return (
    <div className="container max-w-6xl mx-auto py-16 px-4 flex flex-col gap-8">
      <h2 className="text-2xl font-bold border-l-4 border-primary pl-3">活動專區</h2>
      {events.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">目前沒有活動</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {events.map((item, index) => (
            <Link href={`/events/${item.slug}`} key={item.id} className="h-full">
              <EventCard item={item} priority={index === 0} />
            </Link>
          ))}
        </div>
      )}
      <div className="flex justify-center">
        <Button asChild variant="secondary" className="px-12 text-lg">
          <Link href="/events">
            探索更多
          </Link>
        </Button>
      </div>
    </div>
  );
}
