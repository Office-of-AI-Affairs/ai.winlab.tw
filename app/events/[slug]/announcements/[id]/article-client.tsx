"use client"

import { revalidateAllEventCaches } from "@/app/events/actions"
import {
  AnnouncementArticleClient as SharedAnnouncementArticleClient,
  type AnnouncementArticleClientProps,
} from "@/components/announcement-article-client"

type Props = Omit<
  AnnouncementArticleClientProps,
  "backHref" | "shareUrl" | "sharePath" | "onCacheInvalidate" | "breadcrumb"
> & {
  slug: string
  eventName: string
}

export function EventAnnouncementArticleClient({ slug, eventName, ...rest }: Props) {
  const id = rest.initialAnnouncement.id
  return (
    <SharedAnnouncementArticleClient
      {...rest}
      backHref={`/events/${slug}?tab=announcements`}
      backLabel="返回活動"
      sharePath={`/events/${slug}/announcements/${id}`}
      shareUrl={`https://ai.winlab.tw/events/${slug}/announcements/${id}`}
      breadcrumb={[
        { name: "首頁", path: "/" },
        { name: "活動", path: "/events" },
        { name: eventName, path: `/events/${slug}` },
        {
          name: rest.initialAnnouncement.title,
          path: `/events/${slug}/announcements/${id}`,
        },
      ]}
      onCacheInvalidate={revalidateAllEventCaches}
      manageTitle="管理活動公告"
    />
  )
}
