```
███╗   ███╗ ██████╗██████╗ 
████╗ ████║██╔════╝██╔══██╗
██╔████╔██║██║     ██████╔╝
██║╚██╔╝██║██║     ██╔═══╝ 
██║ ╚═╝ ██║╚██████╗██║     
╚═╝     ╚═╝ ╚═════╝╚═╝     
                           
```

# mcp.ai.winlab.tw

`mcp.ai.winlab.tw` is a stateless Model Context Protocol (MCP) server for AI agents. It exposes a Streamable HTTP MCP endpoint backed by Supabase for authentication, storage, and application data.

The repository is intentionally small and server-oriented: Next.js route handlers accept HTTP requests, `lib/` modules hold the reusable logic, and MCP tools are grouped by domain.

## What This Project Does

- exposes a bearer-token protected MCP endpoint at `/mcp`
- supports OAuth-style client registration, authorization, token exchange, and metadata discovery
- provides MCP tools for managing AI Office content stored in Supabase
- supports image uploads through direct URL ingestion and one-time upload URLs for local files

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Supabase
- Zod
- MCP SDK (`@modelcontextprotocol/sdk`)
- Bun

## Project Structure

```text
app/
  api/upload/route.ts      Upload endpoint for direct bearer auth or one-time upload tokens
  mcp/route.ts             MCP HTTP endpoint
  oauth/                   OAuth-related pages and routes
lib/
  auth/                    PKCE and auth code helpers
  mcp/server.ts            MCP server composition root
  supabase/                Supabase client helpers and shared types
  tools/                   MCP tool registration by content domain
```

## Architecture Overview

### MCP endpoint

- `POST /mcp` requires `Authorization: Bearer <token>`
- the route validates the Supabase user from the bearer token
- on success, it builds an MCP server via `lib/mcp/server.ts`
- the server uses Streamable HTTP transport and runs statelessly
- `401` responses include a `WWW-Authenticate` challenge pointing clients to protected resource metadata

### OAuth discovery

- `GET /.well-known/oauth-authorization-server` publishes authorization server metadata
- `GET /.well-known/oauth-protected-resource/mcp` publishes protected resource metadata for the `/mcp` endpoint

### OAuth flow

The repo includes a lightweight OAuth-compatible flow:

- `POST /oauth/register` issues and stores a generated `client_id`
- `GET /oauth/authorize` validates the client request and renders the sign-in and authorization page
- `POST /oauth/callback` signs the user in with Supabase and creates an authorization code
- `POST /oauth/token` exchanges the authorization code plus PKCE verifier for access and refresh tokens, and also supports refresh-token grant
- authorization requests support PKCE `S256` and the MCP `resource` indicator for `/mcp`

### Upload flow

Image uploads are handled through `POST /api/upload`:

- direct bearer-token authenticated upload
- one-time upload-token flow created by the `create_upload_url` MCP tool

Uploads currently target the Supabase Storage bucket `announcement-images` and enforce:

- allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- max file size: 5 MB

## MCP Tool Groups

The MCP server currently registers tools from these domains:

- announcements
- results
- recruitment
- events
- contacts
- carousel
- introduction
- profiles
- images

Representative capabilities include:

- list, get, create, and update announcements
- list, get, create, and update results
- list, get, create, and update recruitments
- list, get, create, and update events
- list event members (with email + tags + "尚無資料" filter, admin only)
- list and update introduction content
- list and update carousel slides and contacts
- read and update the authenticated user's profile
- list profiles
- upload images from public URLs
- generate one-time upload URLs for local image files

## Local Development

Install dependencies:

```bash
bun install
```

Run the dev server:

```bash
bun dev
```

Build for production:

```bash
bun build
```

Start the production server:

```bash
bun start
```

Run lint:

```bash
bun lint
```

## Environment Variables

Set these variables before running the server:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_BASE_URL=
```

Notes:

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is the preferred public key for new deployments
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is still accepted as a backward-compatible fallback
- `NEXT_PUBLIC_BASE_URL` is used when generating one-time upload URLs
- Supabase auth, database access, and storage all depend on the configured project

## Auth Expectations

- `/mcp` rejects requests without a valid bearer token
- OAuth discovery metadata is available through the `/.well-known/*` routes
- upload tokens are one-time use and intended only for the upload flow
- PKCE verification is required for authorization-code exchange
- access tokens and refresh tokens originate from Supabase auth sessions

## Content and Data Conventions

- MCP tools are grouped by domain in `lib/tools/*.ts`
- announcement, result, and introduction rich text can be provided as Markdown or Tiptap JSON
- image categories determine the storage path prefix used in Supabase Storage
- most create/update tools return the affected row directly as MCP JSON payload content

## Deployment Assumptions

- the production base URL is expected to be `https://mcp.ai.winlab.tw`
- the app is designed to run as a stateless HTTP service
- Supabase provides auth, relational storage, and object storage

## Maintenance

- keep this README in sync with `AGENTS.md` and `rules/*.md`
- update this file whenever MCP capabilities, auth flow, environment variables, setup commands, or architecture change

## License

[MIT](LICENSE.md) — Speak, friend, and enter.
