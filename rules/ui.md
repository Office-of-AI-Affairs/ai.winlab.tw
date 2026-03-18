# UI 規則

## 圓角設計原則

兩層設計，定義於 `app/globals.css`：

| Tailwind class | 解析值 | 用途 |
|---|---|---|
| `rounded-sm`, `rounded-md` | **1rem** | 內部元件（Input、Textarea、Select、圖片框、次要按鈕） |
| `rounded-lg` 以上 | **2rem** | 外層容器（Card、Dialog、Block、Button） |
| `rounded-full` | 9999px | 圓形元素（Avatar、Badge、圓形按鈕） |

- `--radius: 2rem`（外層 token）
- 內層元件使用 `rounded-md` 即可，勿改為 `rounded-lg` 以上
- Button 預設使用 `rounded-lg`（2rem），與 Card、Dialog 一致

## 套件

- **shadcn/ui**（`components/ui/`）：基底 UI 元件，新增元件用 `bunx shadcn add <name>`
- **Tailwind CSS v4**：設定在 `app/globals.css`，不使用 `tailwind.config.js`
- **`next-themes`**：`ThemeProvider` 在 root layout，`defaultTheme="light"`

## 字型

| 變數 | 字型 | 用途 |
|------|------|------|
| `--font-noto-sans` | Noto Sans | 主要 UI 文字（對應 `--font-sans`） |
| `--font-noto-sans-mono` | Noto Sans Mono | 程式碼（對應 `--font-mono`） |
| `--font-instrument-serif` | Instrument Serif | 裝飾性標題，需用 inline style 套用 |

> **注意**：Instrument Serif 不能用 Tailwind class，因為 Tailwind v4 `@theme inline` 不會將 CSS var emit 到 `:root`。

## 元件慣例

- `components/ui/card.tsx`：純 `<div>` Server Component，`rounded-[2rem] border border-border`
- `data-slot` 屬性用於親子元件的 CSS 選擇器（如 `has-data-[slot=card-action]`）

## 圖片

- 使用 `next/image`，已設定允許 `*.supabase.co` remote pattern
- Storage bucket：`announcement-images`（public）

| 用途 | 路徑前綴 |
|------|----------|
| Announcement inline 圖片 | root（無前綴） |
| Recruitment 封面 | `competitions/` |
| Result header 圖片 | `results/` |
| OrganizationMember 照片 | `organization/` |
| Event 封面 | `events/` |
