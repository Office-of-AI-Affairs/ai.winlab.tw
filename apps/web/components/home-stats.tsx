import { getHomeStats } from "@/lib/home-data";
import { Card } from "@/components/ui/card";
import type { Dictionary } from "@/lib/i18n/dictionary";

export async function HomeStats({ t }: { t: Dictionary["home"] }) {
  const stats = await getHomeStats();

  const items = [
    { value: stats.publishedResultsCount, label: t.statsResults },
    { value: stats.eventsCount, label: t.statsEvents },
    { value: stats.eventParticipantsCount, label: t.statsParticipants },
    { value: stats.industryPartnersCount, label: t.statsPartners },
  ];

  return (
    <div className="container max-w-6xl mx-auto py-16 px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item) => (
          <Card key={item.label} className="items-center gap-2 py-8">
            <p className="text-4xl font-bold text-primary">
              {item.value.toLocaleString("en-US")}
              <span aria-hidden="true">+</span>
            </p>
            <p className="text-sm text-muted-foreground text-center px-2">{item.label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
