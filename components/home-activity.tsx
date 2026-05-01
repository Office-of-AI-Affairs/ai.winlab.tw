import { AppLink } from "@/components/app-link";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/date";
import { createPublicClient } from "@/lib/supabase/public";

type ActivityItem = {
  kind: "announcement" | "result" | "recruitment";
  id: string;
  title: string;
  eventSlug: string;
  eventName: string;
  createdAt: string;
};

const KIND_LABEL: Record<ActivityItem["kind"], string> = {
  announcement: "公告",
  result: "成果",
  recruitment: "徵才",
};

function buildHref(item: ActivityItem): string {
  switch (item.kind) {
    case "announcement":
      return `/events/${item.eventSlug}/announcements/${item.id}`;
    case "result":
      return `/events/${item.eventSlug}/results/${item.id}`;
    case "recruitment":
      return `/events/${item.eventSlug}/recruitment/${item.id}`;
  }
}

export async function HomeActivity() {
  const supabase = createPublicClient();

  const { data: events } = await supabase
    .from("events")
    .select("id, slug, name")
    .eq("pinned", true)
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  if (!events?.length) return null;
  const eventIds = events.map((e) => e.id);
  const idToEvent = Object.fromEntries(
    events.map((e) => [e.id, { slug: e.slug, name: e.name }]),
  );

  const [annsRes, resultsRes, recruitsRes] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, title, event_id, created_at")
      .in("event_id", eventIds)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("results")
      .select("id, title, event_id, created_at")
      .in("event_id", eventIds)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("competitions")
      .select("id, title, event_id, created_at")
      .in("event_id", eventIds)
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const items: ActivityItem[] = [];
  for (const a of annsRes.data ?? []) {
    const e = a.event_id ? idToEvent[a.event_id] : null;
    if (!e) continue;
    items.push({
      kind: "announcement",
      id: a.id,
      title: a.title,
      eventSlug: e.slug,
      eventName: e.name,
      createdAt: a.created_at,
    });
  }
  for (const r of resultsRes.data ?? []) {
    const e = r.event_id ? idToEvent[r.event_id] : null;
    if (!e) continue;
    items.push({
      kind: "result",
      id: r.id,
      title: r.title,
      eventSlug: e.slug,
      eventName: e.name,
      createdAt: r.created_at,
    });
  }
  for (const c of recruitsRes.data ?? []) {
    const e = c.event_id ? idToEvent[c.event_id] : null;
    if (!e) continue;
    items.push({
      kind: "recruitment",
      id: c.id,
      title: c.title,
      eventSlug: e.slug,
      eventName: e.name,
      createdAt: c.created_at,
    });
  }
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const top = items.slice(0, 10);

  if (top.length === 0) return null;

  // If multiple pinned events, show event name on each row; if just one, drop
  // the redundancy.
  const showEventName = events.length > 1;

  return (
    <section className="py-16 px-4">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-3xl font-bold">最新動態</h2>
          {!showEventName && (
            <span className="text-sm text-muted-foreground">{events[0].name}</span>
          )}
        </div>
        <ul className="flex flex-col gap-2">
          {top.map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              <AppLink
                href={buildHref(item)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors duration-200"
              >
                <Badge variant="secondary" className="shrink-0">
                  {KIND_LABEL[item.kind]}
                </Badge>
                <span className="flex-1 line-clamp-1 text-sm sm:text-base">
                  {item.title}
                </span>
                {showEventName && (
                  <span className="hidden sm:inline shrink-0 text-xs text-muted-foreground">
                    {item.eventName}
                  </span>
                )}
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDate(item.createdAt)}
                </span>
              </AppLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
