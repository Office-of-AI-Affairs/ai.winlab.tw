# Project Skills — ai.winlab.tw

Agent-only knowledge that loads on demand. Each skill is a directory with `SKILL.md`. Claude Code reads `description` to decide when to load. See `.claude/skills/<name>/SKILL.md` for each.

| Skill | Triggers when |
|---|---|
| [`isr-page`](isr-page/SKILL.md) | Adding a public ISR page, wiring cache-tag invalidation, debugging `ƒ Dynamic` |
| [`rls-permissions`](rls-permissions/SKILL.md) | Changing RLS, writing a migration, security audit, snapshot drift |
| [`supabase-storage`](supabase-storage/SKILL.md) | Image upload, bucket maintenance, orphan cleanup, recompress |
| [`inline-view-edit`](inline-view-edit/SKILL.md) | Migrating a content page to share view+edit on one route |
| [`cdn-deploy`](cdn-deploy/SKILL.md) | Deploying / updating the cdn.winlab.tw Cloudflare worker |
| [`perf-audit`](perf-audit/SKILL.md) | Lighthouse run, bundle analysis, perf regression compare |

These are project-scoped (commit-tracked, ship with the repo). Personal cross-project skills live in `~/.claude/skills/` — see `https://github.com/zyx1121/skills` for the canonical set.
