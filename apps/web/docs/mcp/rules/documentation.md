# Documentation Rules

This repository must keep its documentation accurate enough for a new engineer or external integrator to understand what the project is, how it works, and how to run it.

## README Requirement

- The repository should maintain a root `README.md`.
- `README.md` should read like a complete GitHub project README, not a placeholder note.
- `README.md` should always reflect the current project state.

## README Minimum Content

When `README.md` is created or updated, it should cover at least:

- project purpose and scope
- core architecture and major directories
- MCP endpoint behavior and auth expectations
- available major capabilities or MCP tool groups
- local development commands
- required environment variables
- deployment base URL or runtime assumptions when relevant
- any important integration constraints, such as Supabase or upload behavior

## When README Must Be Updated

Update `README.md` in the same change whenever you modify:

- the project goal or scope
- public endpoints or auth flow
- MCP tool capabilities
- required environment variables
- setup, build, or run commands
- storage or upload behavior that affects users or integrators
- architecture in a way that changes how contributors should understand the system

## Agent-Facing Docs

- `AGENTS.md` is for coding-agent operating rules.
- `rules/*.md` is for durable repo guidance by topic.
- `README.md` is for humans and should stay consistent with both.

## Documentation Quality Bar

- Prefer concrete statements over aspirational wording.
- Document the current truth of the repository, not a future wish list.
- If behavior is not implemented yet, do not describe it as present.
- When architecture or conventions change, update the relevant rule file and `README.md` together.
