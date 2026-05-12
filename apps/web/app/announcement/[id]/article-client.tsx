"use client"

import { revalidateAnnouncements } from "@/app/announcement/actions"
import {
  AnnouncementArticleClient as SharedAnnouncementArticleClient,
  type AnnouncementArticleClientProps,
} from "@/components/announcement-article-client"

export function AnnouncementArticleClient(
  props: Omit<
    AnnouncementArticleClientProps,
    "backHref" | "shareUrl" | "sharePath" | "onCacheInvalidate" | "breadcrumb"
  >,
) {
  const id = props.initialAnnouncement.id
  return (
    <SharedAnnouncementArticleClient
      {...props}
      backHref="/announcement"
      backLabel="返回列表"
      sharePath={`/announcement/${id}`}
      shareUrl={`https://ai.winlab.tw/announcement/${id}`}
      breadcrumb={[
        { name: "首頁", path: "/" },
        { name: "公告", path: "/announcement" },
        { name: props.initialAnnouncement.title, path: `/announcement/${id}` },
      ]}
      onCacheInvalidate={revalidateAnnouncements}
      manageTitle="管理公告"
    />
  )
}
