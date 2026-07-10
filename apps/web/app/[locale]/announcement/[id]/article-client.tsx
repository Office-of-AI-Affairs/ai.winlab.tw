"use client"

import { revalidateAnnouncements } from "@/app/[locale]/announcement/actions"
import {
  AnnouncementArticleClient as SharedAnnouncementArticleClient,
  type AnnouncementArticleClientProps,
} from "@/components/announcement-article-client"
import { useT } from "@/lib/i18n/locale-provider"

export function AnnouncementArticleClient(
  props: Omit<
    AnnouncementArticleClientProps,
    "backHref" | "shareUrl" | "sharePath" | "onCacheInvalidate" | "breadcrumb"
  >,
) {
  const t = useT()
  const id = props.initialAnnouncement.id
  return (
    <SharedAnnouncementArticleClient
      {...props}
      backHref="/announcement"
      backLabel={t.actions.backToList}
      sharePath={`/announcement/${id}`}
      shareUrl={`https://ai.winlab.tw/announcement/${id}`}
      breadcrumb={[
        { name: t.common.home, path: "/" },
        { name: t.nav.announcement, path: "/announcement" },
        { name: props.initialAnnouncement.title, path: `/announcement/${id}` },
      ]}
      onCacheInvalidate={revalidateAnnouncements}
      manageTitle={t.editor.manageAnnouncement}
    />
  )
}
