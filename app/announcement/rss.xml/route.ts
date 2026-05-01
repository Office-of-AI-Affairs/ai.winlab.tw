import { createPublicClient } from "@/lib/supabase/public";

const SITE = "https://ai.winlab.tw";

export const revalidate = 600;

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    c === "<"
      ? "&lt;"
      : c === ">"
        ? "&gt;"
        : c === "&"
          ? "&amp;"
          : c === "'"
            ? "&apos;"
            : "&quot;",
  );
}

export async function GET() {
  const supabase = createPublicClient();

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, date, category, event_id, updated_at")
    .eq("status", "published")
    .order("date", { ascending: false })
    .limit(30);

  const eventIds = Array.from(
    new Set((announcements ?? []).map((a) => a.event_id).filter(Boolean)),
  ) as string[];
  let slugMap: Record<string, string> = {};
  if (eventIds.length) {
    const { data: events } = await supabase
      .from("events")
      .select("id, slug")
      .in("id", eventIds);
    slugMap = Object.fromEntries((events ?? []).map((e) => [e.id, e.slug]));
  }

  const itemsXml = (announcements ?? [])
    .map((a) => {
      const url =
        a.event_id && slugMap[a.event_id]
          ? `${SITE}/events/${slugMap[a.event_id]}/announcements/${a.id}`
          : `${SITE}/announcement/${a.id}`;
      const pubDate = new Date(a.date).toUTCString();
      return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>${escapeXml(a.category)}</category>
    </item>`;
    })
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>人工智慧專責辦公室 公告</title>
    <link>${SITE}/announcement</link>
    <description>國立陽明交通大學人工智慧專責辦公室公告 RSS feed</description>
    <language>zh-TW</language>
    <atom:link href="${SITE}/announcement/rss.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${itemsXml}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=600",
    },
  });
}
