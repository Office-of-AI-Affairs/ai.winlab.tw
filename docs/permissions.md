# Permissions Matrix

> **這份是現場快照** — 反推自 production `pg_policy` (snapshot 2026-04-30)。
> 任何 RLS / storage policy 變更前必須先改這份，被 review 通過才寫 migration。
> CI 的 RLS test suite 會以這份為合約跑斷言。漂移即紅 build。

## Roles

| Role | 來源 | 範圍 |
|------|------|------|
| **anon** | 沒有 JWT / 未登入 | 公開讀取 |
| **user** | `profiles.role = 'user'` (default) | 一般登入帳號 |
| **vendor** | `profiles.role = 'vendor'` | **role 標記沒有獨立權限**，真正權限走 `competition_owners` pivot |
| **recruitment_owner** | `competition_owners` 有對應 row | 編輯該筆招募 + 看該筆申請者 |
| **author** | `results.author_id = auth.uid()` | 自己的成果 |
| **team_leader** | `teams.leader_id = auth.uid()` | 自己創的隊伍 |
| **admin** | `profiles.role = 'admin'` | 全平台管理 |

`role` 自身切換只能由 admin 透過 `UPDATE profiles WHERE auth.uid() = id AND role = (current)` 不變身的條件下做。換 role 必須走 admin。

## 圖例

- `✅` 允許
- `❌` 拒絕
- `自己` 限定 `auth.uid() = id / user_id / author_id`
- `published` 限 `status = 'published'`
- 條件寫在格內

## 公開內容（anon 可讀）

### `announcements` — 公告

| Op | anon | user | admin |
|----|:-:|:-:|:-:|
| SELECT | published | published + admin 看 draft | ✅ |
| INSERT | ❌ | ❌ | ✅ |
| UPDATE | ❌ | ❌ | ✅ |
| DELETE | ❌ | ❌ | ✅ |

### `events` — 活動

| Op | anon | user | admin |
|----|:-:|:-:|:-:|
| SELECT | published | published | ✅ |
| INSERT/UPDATE/DELETE | ❌ | ❌ | ✅ |

### `results` — 成果

| Op | anon | user / author / team_leader | admin |
|----|:-:|:-:|:-:|
| SELECT | published | published + 自己 + 自己率隊的 team result | ✅ |
| INSERT | ❌ | author 限自己 / team_leader 限自己率隊 | ✅ |
| UPDATE | ❌ | author 限自己 / team_leader 限自己率隊 | ✅ |
| DELETE | ❌ | author 限自己 / team_leader 限自己率隊 | ✅ |

### `external_results` — 外部成果

| Op | anon | user | admin |
|----|:-:|:-:|:-:|
| SELECT | ✅ 全公開 | ✅ | ✅ |
| INSERT/UPDATE/DELETE | ❌ | 自己 (`user_id = auth.uid()`) | 走自己路徑（無 admin 特權） |

### `result_coauthors` — 成果共同作者

| Op | anon | user | admin |
|----|:-:|:-:|:-:|
| SELECT | 已發布成果的 coauthor | **任何登入者可讀任何 coauthor**（含 draft） | ✅ |
| INSERT | ❌ | result 的 author 限自己 | ✅ |
| DELETE | ❌ | result 的 author 限自己 | ✅ |

> ⚠️ **TODO 釐清**：登入即可讀 draft 成果的 coauthor，這是預期行為嗎？

### `result_tags` — 成果標籤

| Op | anon | user / author / team_leader | admin |
|----|:-:|:-:|:-:|
| SELECT | ✅ 全公開 | ✅ | ✅ |
| INSERT/DELETE | ❌ | result 的 author / team_leader 限自己 | ✅ |

### `tags` — 標籤主檔

| Op | anon | user | admin |
|----|:-:|:-:|:-:|
| SELECT | ✅ | ✅ | ✅ |
| INSERT/UPDATE/DELETE | ❌ | ❌ | ✅ |

### `introduction` — 單頁文案

| Op | anon | user | admin |
|----|:-:|:-:|:-:|
| SELECT | ✅ | ✅ | ✅ |
| INSERT/UPDATE | ❌ | ❌ | ✅ |
| DELETE | ❌ | ❌ | ❌（沒有 policy → 全擋） |

### `carousel_slides` — 首頁輪播

| Op | anon | user | admin |
|----|:-:|:-:|:-:|
| SELECT | ✅ | ✅ | ✅ |
| INSERT/UPDATE/DELETE | ❌ | ❌ | ✅ |

### `contacts` — 聯絡資訊

| Op | anon | user | admin |
|----|:-:|:-:|:-:|
| SELECT | ✅ | ✅ | ✅ |
| INSERT/UPDATE/DELETE | ❌ | ❌ | ✅ |

### `organization_members` — 組織成員

| Op | anon | user | admin |
|----|:-:|:-:|:-:|
| SELECT | ✅ | ✅ | ✅ |
| INSERT/UPDATE/DELETE | ❌ | ❌ | ✅ |

### `privacy_policy` — 隱私政策

| Op | anon | user | admin |
|----|:-:|:-:|:-:|
| SELECT | ✅ | ✅ | ✅ |
| INSERT | ❌ | ❌ | ✅ |
| UPDATE/DELETE | ❌ | ❌ | ❌（沒有 policy → 全擋） |

### `event_participants` — 活動成員

| Op | anon | user | admin |
|----|:-:|:-:|:-:|
| SELECT | ✅ 全公開 | ✅ | ✅ |
| INSERT/DELETE | ❌ | ❌ | ✅ |

### `competitions` — 招募

| Op | anon | user | recruitment_owner | admin |
|----|:-:|:-:|:-:|:-:|
| SELECT | ✅ 全公開 | ✅ | ✅ | ✅ |
| INSERT | ❌ | ❌ | ❌ | ✅ |
| UPDATE | ❌ | ❌ | 自己 own 的招募 | ✅ |
| DELETE | ❌ | ❌ | 自己 own 的招募 | ✅ |

### `public_profiles` — Profile 公開 view

| Op | anon | user | admin |
|----|:-:|:-:|:-:|
| SELECT | ✅ | ✅ | ✅ |
| INSERT/UPDATE/DELETE | ❌ | ❌ | ❌（trigger 維護） |

### `public_teams` — Team 公開 view

| Op | anon | user | admin |
|----|:-:|:-:|:-:|
| SELECT | ✅ | ✅ | ✅ |

## 登入後才能讀

### `profiles` — 個人檔案（**含 phone / resume path**）

| Op | anon | user | admin |
|----|:-:|:-:|:-:|
| SELECT | ❌ | ✅ 全（含他人 phone） | ✅ |
| INSERT | ❌ | 自己 | 自己 |
| UPDATE | ❌ | 自己（不能改 role） | ✅ |
| DELETE | ❌ | ❌ | ❌（沒有 policy） |

> ⚠️ **產品決策已記錄**：phone / social_links / bio 對所有登入者公開，這是 trade-off（PII vs UX）。詳見 commit `d3e6ca4`。

### `competition_private_details` — 招募私密資訊

| Op | anon | user | recruitment_owner | admin |
|----|:-:|:-:|:-:|:-:|
| SELECT | ❌ | **✅ 全部**（含薪資 / 聯絡 email / 應徵需求） | ✅ | ✅ |
| INSERT/UPDATE/DELETE | ❌ | ❌ | 自己 own 的招募 | ✅ |

> ⚠️ **TODO 釐清**：登入即可讀**所有招募的薪資/聯絡 email/需求文件**。如果產品意圖是「登入才能看完整職缺」就 OK；如果想限定到「申請過 / 被指派 owner」就過寬。問 product。

### `competition_owners` — Owner pivot

| Op | anon | user | admin |
|----|:-:|:-:|:-:|
| SELECT | ❌ | 自己 own 的 row | ✅ |
| INSERT/DELETE | ❌ | ❌ | ✅ |

### `recruitment_interests` — 應徵意向

| Op | anon | user | recruitment_owner | admin |
|----|:-:|:-:|:-:|:-:|
| SELECT | ❌ | 自己投的 | 自己 own 的招募的應徵者 | ✅ |
| INSERT | ❌ | 自己（`user_id = auth.uid()`） | 自己 | 自己 |
| DELETE | ❌ | 自己投的 | 自己投的 | 自己投的 |

> ✅ **teams 子系統已下線**（2026-04-30）：`teams` / `team_members` / `team_invitations` / `public_teams` 整組移除，`results.team_id` / `results.type` 欄位也清掉。詳見 commit `20260430000007`。所有 result 現在皆為個人成果（author_id 主導）。

### `result_coauthors` 的修補

`SELECT` 從原本「published OR 任何登入者」收緊到「self OR (result published OR 你是 author OR 你是 admin)」。draft 成果的 coauthor 列表不再對所有登入者開放。詳見 commit `20260430000007`。

### `upload_tokens` — 上傳 token

| Op | anon | user | admin |
|----|:-:|:-:|:-:|
| SELECT | ❌ | ❌（無 policy → service role only） | ❌ |
| INSERT | ❌ | 自己（`user_id = auth.uid()`） | 自己 |

### `oauth_clients`

| Op | anon | user | admin |
|----|:-:|:-:|:-:|
| SELECT | ✅ | ❌ 沒 policy | ❌ |
| INSERT | ✅（含格式 check） | ❌ | ❌ |

> ✅ **跨 repo 用途**：MCP server (`~/mcp.ai.winlab.tw`) 的 OAuth Dynamic Client Registration (RFC 7591) 在用，避免 client 端帶 `SUPABASE_SERVICE_ROLE_KEY`。anon insert 限定最小欄位 + 格式 check。本 repo 不該動。

### `oauth_auth_codes`

| Op | anon | user | admin |
|----|:-:|:-:|:-:|
| 全部 | ❌ | ❌ | ❌（無任何 policy → service role only） |

## Storage Buckets

### `announcement-images` (public bucket)

| Op | anon | user | admin |
|----|:-:|:-:|:-:|
| SELECT | ✅ | ✅ | ✅ |
| INSERT | ❌ | ❌ | ✅ |
| UPDATE/DELETE | ❌ | ❌ | ✅ |

> ✅ **已收緊**（2026-04-30）：INSERT 從「任何登入者」收到「admin only」，因為只有 admin 編輯公告會上傳。詳見 commit `20260430000006`。

### `resumes` (private bucket)

| Op | anon | user | admin |
|----|:-:|:-:|:-:|
| SELECT | ❌ | ✅ 全部（含他人 PDF） | ✅ |
| INSERT/UPDATE/DELETE | ❌ | 自己 folder（`name` 第一段 = `auth.uid()`） | 自己 folder |

> ⚠️ **產品決策已記錄**：登入即可下載任何人的履歷 PDF，這是 trade-off（PII vs UX）。詳見 commit `96cba86`。

## 五條 TODO 的拍板紀錄（2026-04-30）

| # | 議題 | 拍板 |
|---|------|------|
| 1 | `competition_private_details` 登入者直接讀薪資/email/需求 | ✅ **預期** — 登入即可看完整職缺是產品意圖 |
| 2 | `result_coauthors` SELECT 過寬 | ✅ **修** — 收緊到 self / author of result / coauthor of published / admin |
| 3 | `teams` UPDATE/DELETE admin 沒特權 | ✅ **整組砍** — 子系統 0 row 0 用，連同 `team_id` / `type` 欄位 / `is_team_leader` 等函式 |
| 4 | `announcement-images` INSERT 任何登入者 | ✅ **收緊到 admin only** |
| 5 | `oauth_clients` anon insert/read | ✅ **預期** — 跨 repo（MCP server）的 OAuth DCR 在用 |

## 已修補但仍 trade-off 的（記錄用）

- **`profiles` SELECT 對 authenticated `using (true)`** — phone / linkedin / github 等對登入者公開（User UX 偏好優先）
- **`storage.resumes` SELECT 對 authenticated** — PDF 下載對所有登入者開放（同上）

## 維護紀律 + 工具鏈

1. 改 RLS / storage policy 必須先改本檔 → review → 寫 migration
2. 嚴禁 dashboard 直接改 policy（CI 會抓 drift）
3. **RLS contract test** (`lib/security/rls-contracts.test.ts`) 對著 `lib/security/rls-snapshot.json` 跑斷言 — 抓「policy 改了但沒記錄到 snapshot」、「dropped table 被資源化回來」、「critical SELECT 被悄悄放寬」
4. **Snapshot refresh** — RLS migration ship 之後跑 `scripts/refresh-rls-snapshot.md` 裡的 SQL，更新 `lib/security/rls-snapshot.json`，PR diff 即等於 RLS 變動的人類可讀版
5. 命名約定：`<role/scope> can <op> <resource>` (e.g. `Admin can update events`)，不要寫成 `Authenticated can read X` 這種容易誤導的形式
6. （未來）`DATABASE_URL` 進 CI secret 後，可加 `lib/security/rls-runtime.test.ts` 用 SQL `SET LOCAL ROLE` 跑真實 role 模擬 — 抓 contract test 抓不到的 semantic 漂移
