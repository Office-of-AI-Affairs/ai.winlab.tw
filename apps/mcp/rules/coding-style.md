# Coding Style Rules

This document captures the coding style already visible in the repository and should guide future edits.

## General Style

- Use TypeScript everywhere.
- Prefer simple, direct functions over framework-heavy abstractions.
- Keep files focused on one responsibility.
- Match the existing formatting style: double quotes, semicolons, trailing commas where the formatter would keep them.
- Use absolute imports via `@/` for internal modules.

## Naming

- Use descriptive verb-based names for actions: `createMcpServer`, `registerImageTools`, `verifyPkce`.
- Name registration functions as `register<Domain>Tools`.
- Name Supabase helpers by capability, for example `createClientWithToken` and `createServiceClient`.
- Keep constant names uppercase when they are static configuration values, such as `BUCKET` or `MAX_SIZE_BYTES`.

## Functions and Modules

- Export small reusable helpers when logic is shared across routes or tools.
- Prefer top-level helper functions inside a module before extracting a new file.
- Split a file only when it starts mixing unrelated responsibilities.
- Keep helper return shapes explicit and predictable, especially for MCP tool success and error payloads.

## Validation and Errors

- Validate inputs at the edge of the system.
- Use `zod` schemas for MCP tool inputs.
- In HTTP routes, return structured JSON errors with appropriate status codes.
- In MCP tools, return explicit error payloads instead of throwing avoidable runtime errors.
- Prefer clear error messages over generic failure text.

## Next.js and Runtime Conventions

- Treat this repo as a server-oriented Next.js project.
- Avoid adding Client Components unless the product truly needs browser-side interaction.
- Keep route handlers deterministic and easy to read.
- Use `export const dynamic = "force-dynamic";` only where runtime behavior requires it.

## Supabase Conventions

- Use the correct client for the context:
  - bearer-token scoped access for user-authenticated requests
  - service-role access only when truly required
- Keep Supabase table, storage, and auth interactions close to the domain they serve.
- Reuse generated types from `lib/supabase/types.ts` instead of hand-writing duplicate shapes when types are available.

## Comments and Complexity

- Write comments only when they clarify a non-obvious boundary or security-sensitive behavior.
- Do not add redundant narration comments.
- If logic needs extensive explanation, simplify the code first.
