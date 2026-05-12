# MCP OAuth Discovery Design

## Goal

Make `mcp.ai.winlab.tw` behave like a standards-aligned remote MCP server that supports browser-based OAuth login from clients such as Codex, while keeping Supabase Auth as the only identity and token source.

## Current State

The project already has the core pieces of an OAuth bridge:

- [`/mcp`](/Users/loki/mcp.ai.winlab.tw/app/mcp/route.ts) accepts `Authorization: Bearer <token>` and validates the Supabase user.
- [`/oauth/register`](/Users/loki/mcp.ai.winlab.tw/app/oauth/register/route.ts) issues a generated `client_id`.
- [`/oauth/authorize`](/Users/loki/mcp.ai.winlab.tw/app/oauth/authorize/page.tsx) renders a login page.
- [`/oauth/callback`](/Users/loki/mcp.ai.winlab.tw/app/oauth/callback/route.ts) signs the user in and creates an authorization code.
- [`/oauth/token`](/Users/loki/mcp.ai.winlab.tw/app/oauth/token/route.ts) exchanges the code plus PKCE verifier for access and refresh tokens.

What is missing is the discovery and contract layer that lets an MCP client find and trust those endpoints automatically.

## Design Summary

The server will follow the common "Supabase Auth plus Next.js OAuth bridge" model:

- Supabase remains the source of truth for users, access tokens, and refresh tokens.
- Next.js exposes MCP-compatible OAuth discovery and OAuth endpoints.
- `/mcp` remains a thin bearer-token protected resource.
- Authorization codes remain short-lived bridge artifacts stored server-side.
- Dynamic client registration becomes minimally stateful so `client_id` and `redirect_uri` can be validated later.

This design does not introduce a second token system, a custom identity provider, or Vercel KV.

## Standards Targets

The implementation should align with:

- MCP Protected Resource Metadata discovery for the MCP resource server
- OAuth 2.0 Authorization Server Metadata discovery for the authorization server
- Authorization Code + PKCE (`S256` only)
- Dynamic client registration sufficient for MCP clients that register at runtime

## Endpoints

### 1. Protected resource metadata

Add a well-known route for MCP protected resource metadata. Its job is to tell clients that `/mcp` is an OAuth-protected resource and where the authorization server metadata lives.

Responsibilities:

- identify the resource as `https://mcp.ai.winlab.tw/mcp`
- advertise the authorization server metadata URL
- expose supported bearer token usage details if needed by the MCP client

`/mcp` should also return `WWW-Authenticate` on `401` responses, pointing clients to the same metadata location.

### 2. Authorization server metadata

Add a well-known route for authorization server metadata. It will reuse a shared metadata builder from [`lib/auth/oauth-metadata.ts`](/Users/loki/mcp.ai.winlab.tw/lib/auth/oauth-metadata.ts).

Responsibilities:

- publish `issuer`
- publish `authorization_endpoint`
- publish `token_endpoint`
- publish `registration_endpoint`
- declare `response_types_supported: ["code"]`
- declare `grant_types_supported: ["authorization_code", "refresh_token"]`
- declare `code_challenge_methods_supported: ["S256"]`
- declare `token_endpoint_auth_methods_supported: ["none"]`

### 3. Dynamic client registration

Keep [`/oauth/register`](/Users/loki/mcp.ai.winlab.tw/app/oauth/register/route.ts) but change it from a stateless echo into a minimally persistent registration endpoint.

Responsibilities:

- validate client metadata input
- generate `client_id`
- persist the client metadata
- return the registered metadata in the response

Minimum stored fields:

- `client_id`
- `client_name`
- `redirect_uris`
- `grant_types`
- `response_types`
- `created_at`

### 4. Authorization endpoint

Keep [`/oauth/authorize`](/Users/loki/mcp.ai.winlab.tw/app/oauth/authorize/page.tsx) as the browser entry point, but move OAuth request validation into a shared server helper before rendering the login UI.

Responsibilities:

- validate `client_id`
- validate `redirect_uri`
- require `code_challenge`
- require `code_challenge_method === "S256"`
- preserve `state`
- render a user-facing sign-in and consent context

For invalid requests, return a clear OAuth-style error page instead of rendering a normal login form.

### 5. Authorization callback

Keep [`/oauth/callback`](/Users/loki/mcp.ai.winlab.tw/app/oauth/callback/route.ts) as the Supabase login completion step.

Responsibilities:

- authenticate the user with Supabase
- create a short-lived single-use authorization code
- bind the code to `client_id`, `redirect_uri`, and `code_challenge`
- store the Supabase `access_token` and `refresh_token`
- redirect the browser back to the client with `code` and `state`

### 6. Token endpoint

Keep [`/oauth/token`](/Users/loki/mcp.ai.winlab.tw/app/oauth/token/route.ts) as the code exchange and refresh endpoint.

Responsibilities:

- support `authorization_code`
- support `refresh_token`
- verify PKCE with the stored challenge
- verify `client_id`
- verify `redirect_uri`
- return OAuth token responses in a predictable shape

The token response will continue to expose Supabase `access_token` and `refresh_token`.

## Data Model

### Existing table: `oauth_auth_codes`

Keep using [`lib/auth/auth-codes.ts`](/Users/loki/mcp.ai.winlab.tw/lib/auth/auth-codes.ts) and the `oauth_auth_codes` table for short-lived authorization codes.

Required properties:

- code must be single-use
- code must expire quickly
- expired codes must be rejected and cleaned up
- stored payload must include `client_id`, `redirect_uri`, `code_challenge`, `access_token`, and `refresh_token`

### New table: `oauth_clients`

Store dynamic client registrations in Supabase, not Vercel KV.

Reasons:

- the repo already uses Supabase tables for auth-bridge state
- `client_id` and `redirect_uri` validation must be durable across requests
- adding another storage system adds complexity without solving a current problem

Suggested columns:

- `client_id text primary key`
- `client_name text not null`
- `redirect_uris jsonb not null`
- `grant_types jsonb not null`
- `response_types jsonb not null`
- `created_at timestamptz default now()`

## Validation Rules

All OAuth boundary inputs should be validated with explicit Zod schemas.

Validation requirements:

- only `S256` is accepted for PKCE
- `redirect_uri` used in authorize and token must match the stored client metadata
- `client_id` in token exchange must match the code payload and a registered client
- missing or malformed input returns OAuth-compatible errors
- unsupported grant types return `unsupported_grant_type`
- invalid codes, bad PKCE, or mismatched redirect URIs return `invalid_grant`

## Token Model

The MCP client receives Supabase tokens directly.

This is acceptable for this project because:

- `/mcp` already validates Supabase bearer tokens
- Supabase remains the sole token issuer
- the server stays stateless at the MCP layer

Constraints to preserve:

- do not log access or refresh tokens
- do not invent a second access token format
- do not hardcode misleading token lifetime values

If a reliable expiry value cannot be derived from the actual Supabase session, the implementation should prefer a clearly documented conservative value over a made-up constant with no explanation.

## Testing Strategy

Add focused route and helper tests for contracts, not broad end-to-end browser automation.

Minimum test coverage:

- protected resource metadata route returns expected discovery fields
- authorization server metadata route returns expected OAuth metadata
- client registration validates and persists metadata
- invalid authorize requests fail before rendering an approval flow
- token exchange rejects mismatched `client_id`, `redirect_uri`, and bad PKCE
- auth codes are single-use and expire correctly
- `/mcp` `401` responses include the expected `WWW-Authenticate` metadata pointer

## Review Findings On Current Implementation

### 1. Discovery is incomplete

The repo exposes OAuth endpoints but does not currently expose the well-known discovery surface that MCP clients use to find them automatically. This is the most likely reason browser login does not start cleanly from `codex mcp login`.

### 2. Client registration is too weak

[`app/oauth/register/route.ts`](/Users/loki/mcp.ai.winlab.tw/app/oauth/register/route.ts) generates a `client_id` but does not persist the registered client. That means later `client_id` and `redirect_uri` checks cannot be grounded in durable client metadata.

### 3. Token lifetime reporting is unreliable

[`app/oauth/token/route.ts`](/Users/loki/mcp.ai.winlab.tw/app/oauth/token/route.ts) currently returns `expires_in: 3600` as a fixed value. That may not match the actual Supabase project configuration and can mislead clients.

### 4. Authorization request validation is too thin

[`app/oauth/authorize/page.tsx`](/Users/loki/mcp.ai.winlab.tw/app/oauth/authorize/page.tsx) checks only a subset of required request parameters in the client component. Request validation should happen server-side and should include registered client checks.

### 5. Error contracts are inconsistent

The current routes mix plain error strings with OAuth-shaped error responses. MCP clients are easier to integrate when authorization and token failures use predictable OAuth error fields.

## Non-Goals

- replacing Supabase Auth
- introducing a custom token service
- building rich consent management or organization-level scopes
- broad UI redesign outside the existing authorization page
- moving transient auth state into Vercel KV

## Implementation Notes

Keep route handlers thin and put shared validation, metadata generation, and client lookup logic in `lib/auth/`.

Likely code units:

- metadata helpers in `lib/auth/`
- client registration persistence helpers in `lib/auth/`
- one or more new well-known route handlers under `app/`
- small updates to existing OAuth routes
- tests for new helpers and route contracts

## Success Criteria

The work is successful when:

- the configured Codex MCP alias can discover the auth flow and open a browser login
- the login flow completes without manually supplying a bearer token
- `/mcp` still accepts the resulting bearer token and authenticates the user
- the OAuth bridge is materially closer to MCP and OAuth expectations than the current implementation
