# Auth 與 Supabase 規則

## Supabase 客戶端選擇

| 情境 | 匯入路徑 |
|------|----------|
| Client Component | `@/lib/supabase/client` |
| Server Component / Route Handler | `@/lib/supabase/server`（async） |
| proxy.ts（middleware） | `@/lib/supabase/proxy` |

## 授權邏輯

`AuthProvider`（`components/auth-provider.tsx`）包裹整個 app，提供 `useAuth()`：`user`, `profile`, `isAdmin`, `isLoading`, `signIn`, `signOut`。

- 未登入 → 只看 `status: published` 的資料
- 登入非 admin → 可看自己的草稿 + 所有 published
- admin → 完整讀寫權限（`profile.role === 'admin'`）

Server Component 中需自行查 `profiles` 表取得 `isAdmin`（參考 `app/events/[slug]/page.tsx`）。

## 根 Layout 特殊行為

`app/layout.tsx` 在 Server Component 中查詢 `events` 表取得 `pinned=true` 的活動，傳給 `<Header pinnedEvents={...} />`，用於在導覽列動態顯示置頂活動連結。
