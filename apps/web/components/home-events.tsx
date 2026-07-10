import { getFeaturedEvents } from "@/app/[locale]/events/data";
import { EventCard } from "@/components/event-card";
import { Button } from "@/components/ui/button";
import { type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { localizedPath } from "@/lib/i18n/routing";
import Link from "next/link";

export async function HomeEvents({
  t,
  locale,
}: {
  t: Dictionary["home"];
  locale: Locale;
}) {
  const events = await getFeaturedEvents();

  return (
    <div className="container max-w-6xl mx-auto py-16 px-4 flex flex-col gap-8">
      <h2 className="text-2xl font-bold border-l-4 border-primary pl-3">{t.eventsHeading}</h2>
      {events.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">{t.eventsEmpty}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {events.map((item, index) => (
            <Link href={localizedPath(`/events/${item.slug}`, locale)} key={item.id} className="h-full">
              <EventCard item={item} priority={index === 0} />
            </Link>
          ))}
        </div>
      )}
      <div className="flex justify-center">
        <Button asChild variant="secondary" className="px-12 text-lg">
          <Link href={localizedPath("/events", locale)}>
            {t.explore}
          </Link>
        </Button>
      </div>
    </div>
  );
}
