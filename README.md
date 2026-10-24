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
- **Backend**: PostgreSQL 18 + Drizzle ORM, Better Auth
- **Styling**: Tailwind CSS + shadcn/ui
- **Package Manager**: Bun

## Getting Started

```bash
bun install
bun dev
```

## Environment Variables

Start a local Postgres (`apps/web/infra/postgres/compose.yaml` works) and
create `apps/web/.env.local`:

```
DATABASE_URL=postgres://ai:<password>@127.0.0.1:5432/ai
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=<random 32+ characters>
```

The app applies the migrations in `apps/web/drizzle/` on start.

## Documentation

For humans:

- [`DESIGN.md`](DESIGN.md) — design system spec (tokens, layout, floating
  surfaces, component primitives, do's and don'ts). Follows the
  [Google DESIGN.md format](https://github.com/google-labs-code/design.md):
  YAML frontmatter for AI agents + Markdown body for humans. Live gallery
  at [`/design`](https://ai.winlab.tw/design).
- [`CLAUDE.md`](CLAUDE.md) — codebase conventions (architecture, ISR
  pattern, hooks, auth, schema). Read this before opening a PR.

For Claude Code (load on demand):

- [`.claude/skills/`](.claude/skills) — project-scoped agent skills.
  `isr-page`, `inline-view-edit`, `perf-audit`. Each loads only when relevant — see
  [`.claude/skills/README.md`](.claude/skills/README.md) for the index.

## License

[MIT](LICENSE.md) — AI for all.
