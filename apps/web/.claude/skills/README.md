# Project Skills — ai.winlab.tw

Agent-only knowledge that loads on demand. Each skill is a directory with `SKILL.md`. Claude Code reads `description` to decide when to load. See `.claude/skills/<name>/SKILL.md` for each.

| Skill | Triggers when |
|---|---|
| [`isr-page`](isr-page/SKILL.md) | Adding a public ISR page, wiring cache-tag invalidation, debugging `ƒ Dynamic` |
| [`inline-view-edit`](inline-view-edit/SKILL.md) | Migrating a content page to share view+edit on one route |
| [`perf-audit`](perf-audit/SKILL.md) | Lighthouse run, bundle analysis, perf regression compare |

These are project-scoped (commit-tracked, ship with the repo). Personal cross-project skills live in `~/.claude/skills/` — see `https://github.com/zyx1121/skills` for the canonical set.
