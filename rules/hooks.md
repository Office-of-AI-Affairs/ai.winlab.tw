# 共用 Hooks 與工具

## `useAutoSave`（`hooks/use-auto-save.ts`）
所有編輯頁面都使用此 hook，自動 debounce 儲存（預設 3 秒）。提供 `guardNavigation` 防止未儲存就離開。

```ts
const { guardNavigation } = useAutoSave({ hasChanges, onSave });
```

## `nuqs`
URL 搜尋參數狀態管理，使用 `NuqsAdapter`（已在 root layout 包裹）。

## 富文字編輯（`components/tiptap-editor.tsx`）

`TiptapEditor` 用於 Announcement、Result、Introduction 等 content 欄位。內容儲存為 Tiptap JSON（`Record<string, unknown>`）。支援拖放/貼上圖片（呼叫 `uploadAnnouncementImage`）。
