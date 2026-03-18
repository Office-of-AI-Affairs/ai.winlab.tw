# 資料模型（`lib/supabase/types.ts`）

主要實體：

- **Announcement** — 公告，Tiptap JSON 內容，`status: draft|published`，`event_id`（null = 全域）
- **Result** — 競賽/活動成果，`type: personal|team`，`pinned`，`event_id`（null = 全域）
- **Recruitment**（DB table: `competitions`）— 招募，`event_id`，包含 JSON 欄位：`positions: RecruitmentPosition[]`、`application_method: ApplicationMethod`、`contact: ContactInfo`
- **Event** — 活動，`slug`（unique），`status: draft|published`，`pinned`，`sort_order`
- **Introduction** — 單筆辦公室介紹，Tiptap JSON 內容
- **OrganizationMember** — `category: core|legal_entity|industry`
- **Profile** — 繼承 `auth.users`，`role: admin|user`，含 `phone`, `bio`, `linkedin`, `facebook`, `github`, `website`, `resume`, `social_links`
- **ExternalResult** — 使用者自行提交的外部成果連結
- **Tag / ResultTag** — 成果的標籤系統（樹狀結構，`parent_id`）
- **Team / TeamMember / TeamInvitation** — 團隊管理
- **CarouselSlide**, **Contact** — 首頁輪播與聯絡資訊

`event_id IS NULL` → 屬於全域頁面；`IS NOT NULL` → 屬於特定活動。

## 資料庫 Migrations

SQL migrations 放在 `supabase/migrations/`，依序在 Supabase SQL editor 執行。所有表均啟用 RLS。初次設置另需建立 `announcement-images` storage bucket（public）並執行 `supabase/storage-policies.sql`。
