```
 █████╗ ██╗     ██████╗ ███████╗███████╗██╗ ██████╗███████╗
██╔══██╗██║    ██╔═══██╗██╔════╝██╔════╝██║██╔════╝██╔════╝
███████║██║    ██║   ██║█████╗  █████╗  ██║██║     █████╗  
██╔══██║██║    ██║   ██║██╔══╝  ██╔══╝  ██║██║     ██╔══╝  
██║  ██║██║    ╚██████╔╝██║     ██║     ██║╚██████╗███████╗
╚═╝  ╚═╝╚═╝     ╚═════╝ ╚═╝     ╚═╝     ╚═╝ ╚═════╝╚══════╝
```

# NYCU AI Office Website

Official website for the National Yang Ming Chiao Tung University (NYCU) Office of AI Affairs.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Backend**: Supabase
- **Styling**: Tailwind CSS + shadcn/ui
- **Package Manager**: Bun

## Getting Started

```bash
bun install
bun dev
```

## Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=
```

## Documentation

For humans:

- [`DESIGN.md`](DESIGN.md) — design system spec (tokens, layout, floating
  surfaces, component primitives, do's and don'ts). Follows the
  [Google DESIGN.md format](https://github.com/google-labs-code/design.md):
  YAML frontmatter for AI agents + Markdown body for humans. Live gallery
  at [`/design`](https://ai.winlab.tw/design).
- [`CLAUDE.md`](CLAUDE.md) — codebase conventions (architecture, ISR
  pattern, hooks, auth, schema regen). Read this before opening a PR.

For Claude Code (load on demand):

- [`.claude/skills/`](.claude/skills) — project-scoped agent skills.
  `isr-page`, `rls-permissions`, `supabase-storage`, `inline-view-edit`,
  `cdn-deploy`, `perf-audit`. Each loads only when relevant — see
  [`.claude/skills/README.md`](.claude/skills/README.md) for the index.

## License

[MIT](LICENSE.md) — AI for all.
