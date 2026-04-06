# Auth 與 Supabase 規則

## Supabase 客戶端選擇

| 情境 | 匯入路徑 |
|------|----------|
| Client Component | `@/lib/supabase/client` |
| Server Component / Route Handler | `@/lib/supabase/server`（async） |

## 授權邏輯

`AuthProvider`（`components/auth-provider.tsx`）包裹整個 app，提供 `useAuth()`：`user`, `profile`, `isAdmin`, `isLoading`, `signIn`, `signOut`。

- 未登入 → 只看 `status: published` 的資料
- 登入非 admin → 可看自己的草稿 + 所有 published
- admin → 完整讀寫權限（`profile.role === 'admin'`）
- vendor → 可在被指派的活動下建立/編輯/刪除招募（`event_vendors` + `created_by = auth.uid()`）
- `isEventVendor()` in `lib/supabase/check-event-vendor.ts` 負責 server-side 檢查 vendor-event 指派

Server Component 中需自行查 `profiles` 表取得 `isAdmin`。

## 根 Layout 特殊行為

`app/layout.tsx` 在 Server Component 中查詢 `events` 表取得 `pinned=true` 的活動，傳給 `<Header pinnedEvents={...} />`，用於在導覽列動態顯示置頂活動連結。
