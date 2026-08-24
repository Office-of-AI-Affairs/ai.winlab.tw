"use client"

import { revalidateAnnouncements } from "@/app/[locale]/announcement/actions"
import {
  AnnouncementArticleClient as SharedAnnouncementArticleClient,
  type AnnouncementArticleClientProps,
} from "@/components/announcement/announcement-article-client"
import { useLocale, useT } from "@/lib/i18n/locale-provider"
import { localizedField } from "@/lib/i18n/localized-field"

export function AnnouncementArticleClient(
  props: Omit<
    AnnouncementArticleClientProps,
    "backHref" | "shareUrl" | "sharePath" | "onCacheInvalidate" | "breadcrumb"
  >,
) {
  const t = useT()
  const locale = useLocale()
  const slug = encodeURIComponent(props.initialAnnouncement.slug || props.initialAnnouncement.id)
  return (
    <SharedAnnouncementArticleClient
      {...props}
      backHref="/announcement"
      backLabel={t.actions.backToList}
      sharePath={`/announcement/${slug}`}
      shareUrl={`https://ai.winlab.tw/announcement/${slug}`}
      breadcrumb={[
        { name: t.common.home, path: "/" },
        { name: t.nav.announcement, path: "/announcement" },
        {
          name: localizedField(props.initialAnnouncement, "title", locale).value,
          path: `/announcement/${slug}`,
        },
      ]}
      onCacheInvalidate={revalidateAnnouncements}
      manageTitle={t.editor.manageAnnouncement}
    />
  )
}
