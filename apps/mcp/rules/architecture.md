# Architecture Rules

This document records the current architecture of `mcp.ai.winlab.tw` and the boundaries that future changes should preserve unless the system is intentionally redesigned.

## Primary Structure

- `app/` is the HTTP entry layer.
- `lib/` holds reusable implementation logic.
- `app/mcp/route.ts` is the MCP endpoint.
- `app/oauth/*` contains OAuth-facing routes and pages.
- `app/api/upload/route.ts` handles image upload requests.
- `lib/mcp/server.ts` is the single MCP server assembly point.
- `lib/tools/*.ts` groups MCP tools by domain.
- `lib/auth/*` contains OAuth helper logic such as PKCE verification and auth code exchange.
- `lib/supabase/*` contains Supabase client helpers and shared generated types.

## Route Handler Boundaries

- Route handlers should stay thin.
- A route handler may parse the request, authenticate the caller, validate required fields, and format the HTTP response.
- Business logic, shared transforms, and reusable integrations belong in `lib/`, not inline in route handlers.
- If a route grows beyond straightforward request orchestration, split the logic into a helper module.

## MCP Server Boundaries

- Register MCP tools only through `lib/mcp/server.ts`.
- Each tool file should expose one registration function such as `registerImageTools(...)`.
- Tool files should stay domain-oriented: announcements, results, recruitment, events, contacts, carousel, introduction, profiles, images.
- Avoid creating one large catch-all tools file.

## Auth and Security Boundaries

- `/mcp` requires a bearer token and must reject missing, invalid, or expired tokens with `401`.
- OAuth token exchange logic belongs under `app/oauth/*` and `lib/auth/*`.
- PKCE verification should stay in `lib/auth/pkce.ts` or a nearby auth helper, not duplicated across routes.
- Supabase access tokens are security-sensitive. Do not log them, echo them back in debug output, or persist them outside the existing intended flow.
- One-time upload token behavior belongs to the upload path and must remain clearly separated from normal bearer-token auth.

## Storage and Upload Boundaries

- Image upload handling currently targets the `announcement-images` bucket.
- Category-to-prefix mapping is an explicit contract. Extend it carefully and keep upload routes and MCP image tools aligned.
- Validate MIME type and file size before uploading to Supabase Storage.
- Public URL generation should happen after a successful upload only.

## Change Guidance

- When adding a new capability, first decide whether it is:
  - a new HTTP route
  - a new MCP tool in an existing domain
  - a new MCP tool domain
  - a reusable auth, storage, or formatting helper
- Prefer extending the existing boundaries before inventing a new layer.
- If a change alters the architecture described here, update this file and `README.md` in the same change.
