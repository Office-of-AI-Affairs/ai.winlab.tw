"use client"

import { revalidateAllEventCaches } from "@/app/[locale]/events/actions"
import {
  AnnouncementArticleClient as SharedAnnouncementArticleClient,
  type AnnouncementArticleClientProps,
} from "@/components/announcement/announcement-article-client"
import { useLocale, useT } from "@/lib/i18n/locale-provider"
import { localizedField } from "@/lib/i18n/localized-field"

type Props = Omit<
  AnnouncementArticleClientProps,
  "backHref" | "shareUrl" | "sharePath" | "onCacheInvalidate" | "breadcrumb"
> & {
  slug: string
  eventName: string
}

export function EventAnnouncementArticleClient({ slug, eventName, ...rest }: Props) {
  const t = useT()
  const locale = useLocale()
  const announcementSlug = encodeURIComponent(
    rest.initialAnnouncement.slug || rest.initialAnnouncement.id,
  )
  return (
    <SharedAnnouncementArticleClient
      {...rest}
      backHref={`/events/${slug}/announcements`}
      backLabel={t.events.backToEvent}
      sharePath={`/events/${slug}/announcements/${announcementSlug}`}
      shareUrl={`https://ai.winlab.tw/events/${slug}/announcements/${announcementSlug}`}
      breadcrumb={[
        { name: t.common.home, path: "/" },
        { name: t.nav.events, path: "/events" },
        { name: eventName, path: `/events/${slug}` },
        {
          name: localizedField(rest.initialAnnouncement, "title", locale).value,
          path: `/events/${slug}/announcements/${announcementSlug}`,
        },
      ]}
      onCacheInvalidate={revalidateAllEventCaches}
      manageTitle={t.announcement.edit.manageTitle}
    />
  )
}
