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

## 動態與互動

- 統一使用 `duration-200`，不使用 `duration-150`、`duration-300`、`duration-500` 等
- 所有可點擊元素使用 `hover:scale-[1.02]` + `active:scale-[0.98]`，或共用 `.interactive-scale`
- 偏好 Tailwind animation utilities
- 偏好 refs/effects 管理 focus，避免 raw `autoFocus`

## 頁面佈局間距

- 首頁區塊：`py-16`（`home` tier）
- 一般內容頁：`py-12`（`content` tier）
- Admin / 編輯頁：`py-8`（`admin` tier）
- 使用 `PageSection` 而非手寫間距
- 使用 `PageShell` variants（`content`, `contentLoose`, `dashboard`, `admin`, `editor`, `centeredState`, `auth`, `profile`）
- `loading.tsx` 應與對應頁面使用相同 shell variant

## 連結

- 不使用 raw `<a>` tag
- 統一使用 `AppLink` wrapper

## Skeleton 與 Loading

- 使用 shadcn/ui `Skeleton` 作為基底
- High-level UI components should own their matching skeleton components（如 `EventCard` + `EventCardSkeleton`）
- Skeleton 應盡量貼近最終元件的 layout、spacing、比例
- Route-level loading files should compose layout with component-owned skeletons，不手刻重複內容
- Loading wrapper 需與實際頁面的 max-width、padding、gap 一致

## 富文字編輯器互動

- Desktop Tiptap editing should use contextual controls instead of a persistent full toolbar
- Desktop inline formatting 使用 `BubbleMenu`
- Desktop block insertion 使用 `FloatingMenu`，含 `/`-triggered insertion
- Mobile Tiptap editing should use a dedicated compact toolbar instead of desktop-style floating controls
- Mobile block insertion 放在 `+` 按鈕後
- 編輯畫面應接近閱讀模式，不另做 preview-first 流程

## Color tokens

- 不使用 `text-gray-*`、`border-gray-*`、`bg-white` 等硬編碼
- 使用 `text-foreground`、`text-muted-foreground`、`border-border`、`bg-background`、`bg-card`

## 套件

- **shadcn/ui**（`components/ui/`）：基底 UI 元件，新增用 `bunx shadcn add <name>`
- **Tailwind CSS v4**：設定在 `app/globals.css`，不使用 `tailwind.config.js`
- **`next-themes`**：`ThemeProvider` 在 root layout，`defaultTheme="light"`

## 字型

| 變數 | 字型 | 用途 |
|------|------|------|
| `--font-noto-sans` | Noto Sans | 主要 UI 文字（對應 `--font-sans`） |
| `--font-noto-sans-mono` | Noto Sans Mono | 程式碼（對應 `--font-mono`） |
| `--font-instrument-serif` | Instrument Serif | 裝飾性標題，需用 inline style 套用 |

## 元件慣例

- `components/ui/card.tsx`：純 `<div>` Server Component
- `data-slot` 屬性用於親子元件 CSS 選擇器

## 圖片

- 使用 `next/image`，已設定允許 `*.supabase.co` remote pattern
- Storage bucket：`announcement-images`（public）

| 用途 | 路徑前綴 |
|------|----------|
| Announcement inline 圖片 | root（無前綴） |
| Recruitment 封面 | `recruitment/` |
| Result header 圖片 | `results/` |
| OrganizationMember 照片 | `organization/` |
| Event 封面 | `events/` |
