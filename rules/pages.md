# 頁面結構

## 首頁（`/`）
Server Components 組合，各自獨立 fetch：`HomeCarousel`, `HomeIntroduction`, `HomeOrganization`, `HomeAnnouncement`, `HomeEvents`, `HomeContacts`。

## 活動系統（`/events`）
- `/events` — 活動列表（client）
- `/events/[slug]` — 活動詳情，含公告/成果/招募三分頁（server + client）
- `/events/[slug]/edit` — admin 編輯活動 metadata
- `/events/[slug]/announcements/[id]`、`/edit`
- `/events/[slug]/results/[id]`、`/edit`（非 admin 可建立自己的成果）
- `/events/[slug]/recruitment/[id]/page.tsx`（admin only）

## 內容管理（需登入）
- `/announcement`、`/announcement/[id]`、`/announcement/[id]/edit`
- `/result`（全域，目前未使用，成果移至活動下）
- `/recruitment` — 全域招募列表（DB table: `competitions`）
- `/introduction`、`/introduction/edit`
- `/organization`、`/organization/[id]/edit`
- `/carousel/[id]/edit`、`/contacts/[id]/edit`

## 帳號與個人頁面
- `/account` — 個人資料 + 隊伍 + 邀請
- `/account/teams`、`/account/teams/[id]`
- `/profile/[id]` — 公開作者頁（個人資料 + 發布文章）
- `/team/[id]` — 公開團隊頁

## Admin 專用
- `/settings` — 使用者管理
