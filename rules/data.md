# 資料模型（`lib/supabase/types.ts`）

主要實體：

- **Announcement** — 公告，Tiptap JSON 內容，`status: draft|published`，`event_id`（null = 全域）
- **Result** — 競賽/活動成果，`type: personal|team`，`pinned`，`event_id`
- **Recruitment**（DB table: `competitions`）— 招募，`event_id`，包含 JSON 欄位：`positions`、`application_method`、`contact`；`created_by` 追蹤作者
- **EventVendor**（DB table: `event_vendors`）— vendor 與活動的關聯
- **RecruitmentInterest**（DB table: `recruitment_interests`）— 使用者對招募的感興趣紀錄
- **Event** — 活動，`slug`（unique），`status: draft|published`，`pinned`，`sort_order`
- **Introduction** — 單筆辦公室介紹，Tiptap JSON 內容
- **OrganizationMember** — `category: core|legal_entity|industry`
- **Profile** — 繼承 `auth.users`，`role: admin|user|vendor`，含 profile fields、social links、resume
- **ExternalResult** — 使用者自行提交的外部成果連結
- **Tag / ResultTag** — 成果的標籤系統（樹狀結構，`parent_id`）
- **Team** — 團隊管理
- **CarouselSlide**, **Contact** — 首頁輪播與聯絡資訊

慣例：

- `event_id IS NULL` → 全域內容（僅 Announcement）
- `event_id IS NOT NULL` → 屬於特定活動
- Recruitment 一律為活動範圍，無全域招募頁
- Results 無全域列表頁，詳情頁在 `/events/[slug]/results/[id]`

## 資料庫與儲存

- SQL migrations 放在 `supabase/migrations/`，依序在 Supabase SQL Editor 執行
- 所有表均啟用 RLS
- 初次設置另需建立 `announcement-images` storage bucket（public），並於 Supabase Dashboard 設定 storage policies
