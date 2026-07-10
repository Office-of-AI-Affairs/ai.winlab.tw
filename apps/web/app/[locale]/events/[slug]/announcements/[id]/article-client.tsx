"use client"

import { revalidateAllEventCaches } from "@/app/[locale]/events/actions"
import {
  AnnouncementArticleClient as SharedAnnouncementArticleClient,
  type AnnouncementArticleClientProps,
} from "@/components/announcement-article-client"
import { useT } from "@/lib/i18n/locale-provider"

type Props = Omit<
  AnnouncementArticleClientProps,
  "backHref" | "shareUrl" | "sharePath" | "onCacheInvalidate" | "breadcrumb"
> & {
  slug: string
  eventName: string
}

export function EventAnnouncementArticleClient({ slug, eventName, ...rest }: Props) {
  const t = useT()
  const id = rest.initialAnnouncement.id
  return (
    <SharedAnnouncementArticleClient
      {...rest}
      backHref={`/events/${slug}/announcements`}
      backLabel={t.events.backToEvent}
      sharePath={`/events/${slug}/announcements/${id}`}
      shareUrl={`https://ai.winlab.tw/events/${slug}/announcements/${id}`}
      breadcrumb={[
        { name: t.common.home, path: "/" },
        { name: t.nav.events, path: "/events" },
        { name: eventName, path: `/events/${slug}` },
        {
          name: rest.initialAnnouncement.title,
          path: `/events/${slug}/announcements/${id}`,
        },
      ]}
      onCacheInvalidate={revalidateAllEventCaches}
      manageTitle={t.announcement.edit.manageTitle}
    />
  )
}
