# Notion-Like Editor Design

## Goal

讓公告、成果、簡介、隱私政策等 Tiptap 編輯畫面從「固定底部工具列 + 內容卡片」改成更接近 Notion 的「內容畫布主導」模式，讓編輯與閱讀的視覺結果盡量一致，並依裝置分流桌機與手機的工具列互動。

## Current State

- 編輯器核心集中在 [components/tiptap-editor.tsx](/Users/loki/ai/components/tiptap-editor.tsx)。
- 目前工具列固定在底部，和游標位置或選取範圍無關。
- 閱讀頁與編輯頁雖然都使用 `prose` 類型，但仍然是兩套操作心智模型：
  - 閱讀頁是文件本體
  - 編輯頁是「外面一層編輯器 UI + 裡面一塊內容」
- 手機與桌機目前共用同一套 toolbar 結構。

## Product Direction

### Principle 1: Read and edit should share the same canvas

編輯模式不應再像獨立控制台。使用者看到的主畫面應直接接近最終輸出，只保留必要的編輯態差異：

- caret
- selection highlight
- placeholder
- focus affordance
- contextual tools

### Principle 2: Desktop and mobile should diverge intentionally

桌機版與手機版不應勉強共用同一套工具列互動。

- 桌機版採用上下文工具列，接近 Notion 的 selection-first 體驗。
- 手機版保留較穩定的底部或鍵盤上方工具列，不追求游標旁浮動。

### Principle 3: Toolbar should become contextual, not persistent

編輯工具不應常駐佔據頁面注意力。只在使用者需要時出現：

- 選取文字時出現 inline formatting menu
- 游標停在空段落或 block 起始處時出現 block menu
- 手機版保留高頻操作入口

## Evaluated Approaches

### Approach A: Keep the current fixed toolbar and only restyle the canvas

優點：

- 風險最低
- 改動量最小

缺點：

- 仍然不像 Notion
- 工具列仍然主導整個畫面
- edit/read 的心智模型差異仍然很大

結論：只能作為過渡，不是目標方案。

### Approach B: One shared responsive toolbar for both desktop and mobile

優點：

- 元件數量較少
- 實作似乎比較省

缺點：

- 會在桌機與手機之間做大量折衷
- 桌機不夠像 Notion
- 手機可用性容易下降

結論：不建議。

### Approach C: Split desktop and mobile editor interactions

優點：

- 最符合 Notion 的實際產品策略
- 桌機可以使用 `BubbleMenu` / `FloatingMenu`
- 手機可以保留簡化工具列，避免浮動 UI 干擾輸入

缺點：

- 需要拆分 toolbar 架構
- 需要明確設計 command helper 邊界

結論：推薦採用。

## Chosen Design

### 1. Shared canvas first

`TiptapEditor` 保留作為共享編輯畫布殼層，但它的主要責任將收斂為：

- 初始化 editor extensions
- 提供一致的 `editorProps`
- 組裝桌機與手機各自的 contextual controls
- 輸出和閱讀頁接近的 typography canvas

畫布本身會優先對齊：

- [components/result-detail.tsx](/Users/loki/ai/components/result-detail.tsx)
- [components/introduction-detail.tsx](/Users/loki/ai/components/introduction-detail.tsx)
- 公告 detail 頁的 `prose` 呈現風格

### 2. Desktop interaction model

桌機版採兩層工具：

- `BubbleMenu`
  - 只在選取文字時出現
  - 提供 inline formatting
  - 第一版只保留高頻功能：
    - bold
    - italic
    - strike
    - heading
    - bullet list
    - ordered list
    - text align

- `FloatingMenu`
  - 只在空段落或 block 起始處出現
  - 作為 block insertion menu
  - 第一版只提供目前專案已經有的內容型別：
    - heading
    - bullet list
    - ordered list
    - image
    - youtube

### 3. Mobile interaction model

手機版不實作游標旁浮動 toolbar。

改成：

- 保留底部或鍵盤上方的 compact toolbar
- 功能縮到高頻操作：
  - bold
  - italic
  - heading
  - list
  - media entry
- block insertion 用明確的 `+` 入口，而不是桌機的 floating menu

### 4. Preview mode changes

編輯畫布與閱讀畫布變得足夠接近後，公告/成果/簡介頁的 `preview` 開關就不再是主要依賴。

短期：

- 可以保留現有 preview toggle，降低導入風險

中期：

- 評估移除或弱化 preview mode，讓 editor 成為主體驗

## File Boundaries

### Existing file to keep

- [components/tiptap-editor.tsx](/Users/loki/ai/components/tiptap-editor.tsx)

### New files to introduce

- `components/tiptap-editor-shared.ts`
  - editor commands 與 shared menu button helpers
- `components/tiptap-desktop-bubble-menu.tsx`
  - 選字時的桌機 inline formatting menu
- `components/tiptap-desktop-floating-menu.tsx`
  - block-level 插入 menu
- `components/tiptap-mobile-toolbar.tsx`
  - 手機版 compact toolbar

如果重構過程發現 `components/tiptap-editor.tsx` 仍然過大，可以再往下拆。

## Data Flow

- 上層 page/client 仍然只傳：
  - `content`
  - `onChange`
  - `editable`
- `TiptapEditor` 內部根據 media query 或 CSS breakpoint 決定掛哪一種控制層
- 所有 toolbar action 都透過 shared command helpers 呼叫 editor instance

## Accessibility

- Bubble menu 只在有選取內容時可見，必須有明確 `aria-label`
- 手機 toolbar 不能遮擋主要輸入區
- focus 樣式仍需保留在 editor canvas
- 不依賴 `autoFocus` 來驅動主要互動

## Risks

### Risk 1: Desktop bubble menu and mobile toolbar drift apart

解法：

- 共享 command helper
- 共享 toolbar button primitive
- 測試鎖住「哪些功能在哪一端可用」

### Risk 2: Canvas parity causes regressions in read mode typography

解法：

- 先把共用 typography contract 抽清楚
- 以 render contract 測試保護 class 結構

### Risk 3: Floating menu on desktop feels unstable

解法：

- 第一版先做簡化 block menu
- 不一次追求完整 slash command 系統

## Testing Strategy

- 擴充 [lib/ui/accessibility-contracts.test.ts](/Users/loki/ai/lib/ui/accessibility-contracts.test.ts)
  - 確保不再有固定底部 toolbar 作為唯一編輯入口
- 擴充 [lib/ui/render-contracts.test.tsx](/Users/loki/ai/lib/ui/render-contracts.test.tsx)
  - 驗證桌機與手機 toolbar 組件的 render 契約
- 保留 [lib/ui/patterns.test.ts](/Users/loki/ai/lib/ui/patterns.test.ts)
  - 鎖住 focus / 文案 / motion / editor 規範

## Scope Boundaries

這一輪不包含：

- 完整 Notion block drag handle
- 協作游標
- AI menu
- comments
- mention system
- 完整 slash command palette

這一輪的目標是做出「Notion-like writing mode」，不是完整複製 Notion。
