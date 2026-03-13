# MCP Server Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a remote MCP server at mcp.ai.winlab.tw that exposes NYCU AI Office content management to AI agents via Streamable HTTP with OAuth 2.1 wrapping Supabase auth.

**Architecture:** Next.js App Router on Vercel, stateless Streamable HTTP transport, Supabase JWT pass-through for RLS enforcement, Vercel KV for OAuth auth code storage.

**Tech Stack:** Next.js 16, @modelcontextprotocol/server + @modelcontextprotocol/node, @supabase/supabase-js, @vercel/kv, unified + remark-parse, zod v4

**Design doc:** `docs/plans/2026-03-13-mcp-server-design.md` (in main site repo)

---

## Important Notes

- This is a **NEW repo** — all files are created from scratch
- The new repo will be initialized at a sibling directory (e.g., `/Users/loki/mcp-ai`)
- Supabase types are copied from the main site (`/Users/loki/ai/lib/supabase/types.ts`)
- MCP SDK v2 uses `@modelcontextprotocol/server` for McpServer and `@modelcontextprotocol/node` for Node transport
- Zod v4 is required (`import * as z from 'zod/v4'`)
- `NodeStreamableHTTPServerTransport` expects Node.js `IncomingMessage`/`ServerResponse` — we need an adapter for Next.js App Router's Web API `Request`/`Response`
- All MCP tools use stateless mode (`sessionIdGenerator: undefined`)

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `.env.local.example`
- Create: `.gitignore`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`

**Step 1: Initialize project directory**

```bash
mkdir -p /Users/loki/mcp-ai
cd /Users/loki/mcp-ai
git init
```

**Step 2: Create package.json**

```json
{
  "name": "mcp-ai-winlab",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "next": "^16.1.4",
    "react": "^19.2.3",
    "react-dom": "^19.2.3",
    "@modelcontextprotocol/server": "latest",
    "@modelcontextprotocol/node": "latest",
    "@supabase/supabase-js": "^2.91.0",
    "@vercel/kv": "latest",
    "unified": "^11.0.0",
    "remark-parse": "^11.0.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "typescript": "^5",
    "eslint": "^9",
    "eslint-config-next": "^16.1.4",
    "@tailwindcss/postcss": "^4",
    "tailwindcss": "^4"
  }
}
```

Note: Zod v4 is accessed via `zod/v4` import path from zod 3.25+.

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 4: Create next.config.ts**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@modelcontextprotocol/server", "@modelcontextprotocol/node"],
};

export default nextConfig;
```

`serverExternalPackages` prevents Next.js from bundling the MCP SDK (which uses Node.js APIs).

**Step 5: Create .env.local.example**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
KV_REST_API_URL=
KV_REST_API_TOKEN=
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**Step 6: Create .gitignore**

```
node_modules/
.next/
.env.local
.env*.local
```

**Step 7: Create minimal app/layout.tsx and app/page.tsx**

`app/layout.tsx`:
```tsx
export const metadata = { title: "NYCU AI Office MCP Server" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`app/page.tsx`:
```tsx
export default function Home() {
  return (
    <main>
      <h1>NYCU AI Office MCP Server</h1>
      <p>This is the MCP endpoint for AI agents. Connect via Streamable HTTP at <code>/mcp</code>.</p>
    </main>
  );
}
```

**Step 8: Install dependencies and verify**

```bash
cd /Users/loki/mcp-ai
bun install
bun dev
# Should start on http://localhost:3000 with the landing page
# Ctrl+C to stop
```

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js project for MCP server"
```

---

### Task 2: Supabase Client Setup

**Files:**
- Create: `lib/supabase/types.ts` (copy from main site)
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

**Step 1: Copy types from main site**

```bash
mkdir -p /Users/loki/mcp-ai/lib/supabase
cp /Users/loki/ai/lib/supabase/types.ts /Users/loki/mcp-ai/lib/supabase/types.ts
```

**Step 2: Create browser client** (`lib/supabase/client.ts`)

Used by the OAuth login page (client component).

```typescript
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const createClient = () =>
  createSupabaseClient(supabaseUrl, supabaseAnonKey);
```

**Step 3: Create server client from JWT** (`lib/supabase/server.ts`)

This is different from the main site — it creates a client authenticated with a specific JWT token (the pass-through token from MCP requests), not from cookies.

```typescript
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Create a Supabase client authenticated with a user's JWT.
 * RLS policies are enforced based on this token.
 */
export function createClientWithToken(accessToken: string) {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}

/**
 * Create a Supabase client with the service role key (bypasses RLS).
 * Only for admin operations like token refresh verification.
 */
export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createSupabaseClient(supabaseUrl, serviceKey);
}
```

**Step 4: Commit**

```bash
git add lib/supabase/
git commit -m "feat: add Supabase client setup with JWT pass-through"
```

---

### Task 3: Node.js ↔ Web API Adapter + MCP Endpoint

**Files:**
- Create: `lib/mcp/adapter.ts`
- Create: `lib/mcp/server.ts`
- Create: `app/mcp/route.ts`

This is the trickiest part. `NodeStreamableHTTPServerTransport` expects Node.js `IncomingMessage`/`ServerResponse`. Next.js App Router provides Web API `Request`/`Response`. We need an adapter.

**Step 1: Create the adapter** (`lib/mcp/adapter.ts`)

```typescript
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { Readable } from "node:stream";

/**
 * Convert a Web API Request into a Node.js IncomingMessage.
 * Only the properties needed by NodeStreamableHTTPServerTransport are populated.
 */
export function webRequestToNode(
  request: Request,
  body: Buffer,
): IncomingMessage {
  const readable = new Readable();
  readable.push(body);
  readable.push(null);

  const nodeReq = Object.assign(readable, {
    method: request.method,
    url: new URL(request.url).pathname,
    headers: Object.fromEntries(request.headers.entries()),
    socket: new Socket(),
  }) as unknown as IncomingMessage;

  return nodeReq;
}

/**
 * Create a Node.js ServerResponse that captures output into a Web API Response.
 * Returns a { nodeRes, getWebResponse } pair.
 */
export function createCaptureResponse(): {
  nodeRes: ServerResponse;
  getWebResponse: () => Promise<Response>;
} {
  const chunks: Buffer[] = [];
  let statusCode = 200;
  const headers = new Headers();
  let resolvePromise: (res: Response) => void;

  const responsePromise = new Promise<Response>((resolve) => {
    resolvePromise = resolve;
  });

  // Create a minimal Socket to satisfy ServerResponse constructor
  const socket = new Socket();
  const nodeRes = new ServerResponse(
    new IncomingMessage(socket),
  );

  // Intercept writes
  const originalWrite = nodeRes.write.bind(nodeRes);
  const originalEnd = nodeRes.end.bind(nodeRes);

  nodeRes.write = ((
    chunk: any,
    encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
    callback?: (error?: Error | null) => void,
  ): boolean => {
    if (chunk) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const cb = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
    if (cb) cb(null);
    return true;
  }) as any;

  nodeRes.end = ((
    chunk?: any,
    encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
    callback?: (error?: Error | null) => void,
  ): ServerResponse => {
    if (chunk) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    statusCode = nodeRes.statusCode;

    // Copy headers
    const rawHeaders = nodeRes.getHeaders();
    for (const [key, value] of Object.entries(rawHeaders)) {
      if (value !== undefined) {
        headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
      }
    }

    resolvePromise(
      new Response(Buffer.concat(chunks), {
        status: statusCode,
        headers,
      }),
    );

    const cb = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
    if (cb) cb(null);
    return nodeRes;
  }) as any;

  return {
    nodeRes,
    getWebResponse: () => responsePromise,
  };
}
```

**Step 2: Create the MCP server factory** (`lib/mcp/server.ts`)

This creates a fresh McpServer instance for each request (stateless). Tools are registered here. For now, register a single `ping` tool to verify the setup works.

```typescript
import { McpServer } from "@modelcontextprotocol/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as z from "zod/v4";

export function createMcpServer(supabase: SupabaseClient, userId: string) {
  const server = new McpServer({
    name: "nycu-ai-office",
    version: "0.1.0",
  });

  // Placeholder tool to verify the setup
  server.registerTool(
    "ping",
    {
      description: "Test connectivity and auth. Returns the authenticated user ID.",
      inputSchema: z.object({}),
    },
    async () => {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ success: true, data: { userId } }),
          },
        ],
      };
    },
  );

  return server;
}
```

**Step 3: Create the MCP route handler** (`app/mcp/route.ts`)

```typescript
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import { createMcpServer } from "@/lib/mcp/server";
import { createClientWithToken } from "@/lib/supabase/server";
import { webRequestToNode, createCaptureResponse } from "@/lib/mcp/adapter";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // 1. Extract Bearer token
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return Response.json(
      { error: "Missing Authorization header" },
      { status: 401 },
    );
  }

  // 2. Verify token and get user
  const supabase = createClientWithToken(token);
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return Response.json(
      { error: "Invalid or expired token" },
      { status: 401 },
    );
  }

  // 3. Create MCP server with authenticated Supabase client
  const server = createMcpServer(supabase, user.id);

  // 4. Create stateless transport
  const transport = new NodeStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
  });
  await server.connect(transport);

  // 5. Convert Web Request → Node.js and handle
  const body = Buffer.from(await request.arrayBuffer());
  const nodeReq = webRequestToNode(request, body);
  const { nodeRes, getWebResponse } = createCaptureResponse();

  await transport.handleRequest(nodeReq, nodeRes, JSON.parse(body.toString()));

  // 6. Return captured response
  return getWebResponse();
}

// GET for SSE (server-initiated messages) - not needed for stateless but required by spec
export async function GET() {
  return Response.json(
    { error: "SSE not supported in stateless mode" },
    { status: 405 },
  );
}

// DELETE for session termination - not needed for stateless
export async function DELETE() {
  return Response.json(
    { error: "Sessions not supported in stateless mode" },
    { status: 405 },
  );
}
```

**Step 4: Verify dev server starts**

```bash
cd /Users/loki/mcp-ai
bun dev
# Should compile without errors
```

**Step 5: Commit**

```bash
git add lib/mcp/ app/mcp/
git commit -m "feat: add MCP Streamable HTTP endpoint with Node.js adapter"
```

---

### Task 4: OAuth Metadata + PKCE + Auth Code Store

**Files:**
- Create: `lib/auth/oauth-metadata.ts`
- Create: `lib/auth/pkce.ts`
- Create: `lib/auth/auth-codes.ts`
- Create: `app/.well-known/oauth-authorization-server/route.ts`

**Step 1: Create OAuth metadata** (`lib/auth/oauth-metadata.ts`)

```typescript
export function getOAuthMetadata(baseUrl: string) {
  return {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  };
}
```

**Step 2: Create PKCE utility** (`lib/auth/pkce.ts`)

```typescript
import { createHash } from "node:crypto";

/**
 * Verify PKCE code_verifier against stored code_challenge (S256 method).
 */
export function verifyPkce(
  codeVerifier: string,
  codeChallenge: string,
): boolean {
  const hash = createHash("sha256").update(codeVerifier).digest("base64url");
  return hash === codeChallenge;
}
```

**Step 3: Create auth code store** (`lib/auth/auth-codes.ts`)

Uses Vercel KV for short-lived auth code ↔ Supabase session mapping.

```typescript
import { kv } from "@vercel/kv";
import { randomBytes } from "node:crypto";

interface StoredAuthData {
  accessToken: string;
  refreshToken: string;
  codeChallenge: string;
  redirectUri: string;
  clientId: string;
}

const AUTH_CODE_PREFIX = "mcp:auth:";
const AUTH_CODE_TTL_SECONDS = 300; // 5 minutes

/**
 * Generate an auth code and store the associated session data.
 */
export async function createAuthCode(data: StoredAuthData): Promise<string> {
  const code = randomBytes(32).toString("hex");
  await kv.set(`${AUTH_CODE_PREFIX}${code}`, JSON.stringify(data), {
    ex: AUTH_CODE_TTL_SECONDS,
  });
  return code;
}

/**
 * Exchange an auth code for stored session data. Single-use: deletes after retrieval.
 */
export async function exchangeAuthCode(
  code: string,
): Promise<StoredAuthData | null> {
  const key = `${AUTH_CODE_PREFIX}${code}`;
  const raw = await kv.get<string>(key);
  if (!raw) return null;

  // Delete immediately (single-use)
  await kv.del(key);

  return typeof raw === "string" ? JSON.parse(raw) : raw;
}
```

**Step 4: Create well-known endpoint** (`app/.well-known/oauth-authorization-server/route.ts`)

```typescript
import { getOAuthMetadata } from "@/lib/auth/oauth-metadata";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return Response.json(getOAuthMetadata(baseUrl));
}
```

**Step 5: Commit**

```bash
git add lib/auth/ app/.well-known/
git commit -m "feat: add OAuth 2.1 metadata, PKCE, and auth code store"
```

---

### Task 5: OAuth Authorize Page (Login UI)

**Files:**
- Create: `app/oauth/authorize/page.tsx`
- Create: `app/oauth/callback/route.ts`

**Step 1: Create the authorize page** (`app/oauth/authorize/page.tsx`)

This is a client component that shows a login form. On successful Supabase login, it generates an auth code and redirects back to the MCP client.

```tsx
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AuthorizeForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const clientId = searchParams.get("client_id") || "";
  const redirectUri = searchParams.get("redirect_uri") || "";
  const codeChallenge = searchParams.get("code_challenge") || "";
  const codeChallengeMethod = searchParams.get("code_challenge_method") || "";
  const state = searchParams.get("state") || "";

  if (!redirectUri || !codeChallenge || codeChallengeMethod !== "S256") {
    return <p>Invalid OAuth request. Missing required parameters.</p>;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/oauth/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          clientId,
          redirectUri,
          codeChallenge,
          state,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      // Redirect back to MCP client with auth code
      window.location.href = data.redirectUrl;
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", fontFamily: "system-ui" }}>
      <h1>NYCU AI Office</h1>
      <p>Sign in to authorize MCP access</p>
      {clientId && <p style={{ color: "#666", fontSize: 14 }}>Client: {clientId}</p>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ padding: "8px 24px", cursor: loading ? "wait" : "pointer" }}
        >
          {loading ? "Signing in..." : "Authorize"}
        </button>
      </form>
    </div>
  );
}

export default function AuthorizePage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <AuthorizeForm />
    </Suspense>
  );
}
```

**Step 2: Create the callback handler** (`app/oauth/callback/route.ts`)

This receives the login credentials, authenticates with Supabase, creates an auth code, and returns the redirect URL.

```typescript
import { createClient } from "@supabase/supabase-js";
import { createAuthCode } from "@/lib/auth/auth-codes";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: Request) {
  const { email, password, clientId, redirectUri, codeChallenge, state } =
    await request.json();

  if (!email || !password || !redirectUri || !codeChallenge) {
    return Response.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  // Authenticate with Supabase
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    return Response.json(
      { error: error?.message || "Authentication failed" },
      { status: 401 },
    );
  }

  // Store session and generate auth code
  const code = await createAuthCode({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    codeChallenge,
    redirectUri,
    clientId: clientId || "unknown",
  });

  // Build redirect URL
  const redirect = new URL(redirectUri);
  redirect.searchParams.set("code", code);
  if (state) redirect.searchParams.set("state", state);

  return Response.json({ redirectUrl: redirect.toString() });
}
```

**Step 3: Commit**

```bash
git add app/oauth/
git commit -m "feat: add OAuth authorize page and callback handler"
```

---

### Task 6: OAuth Token Endpoint

**Files:**
- Create: `app/oauth/token/route.ts`

**Step 1: Create token endpoint** (`app/oauth/token/route.ts`)

Handles two grant types: `authorization_code` (initial exchange) and `refresh_token` (token refresh).

```typescript
import { createClient } from "@supabase/supabase-js";
import { exchangeAuthCode } from "@/lib/auth/auth-codes";
import { verifyPkce } from "@/lib/auth/pkce";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: Request) {
  const body = await request.formData();
  const grantType = body.get("grant_type") as string;

  if (grantType === "authorization_code") {
    return handleAuthorizationCode(body);
  } else if (grantType === "refresh_token") {
    return handleRefreshToken(body);
  }

  return Response.json(
    { error: "unsupported_grant_type" },
    { status: 400 },
  );
}

async function handleAuthorizationCode(body: FormData) {
  const code = body.get("code") as string;
  const codeVerifier = body.get("code_verifier") as string;

  if (!code || !codeVerifier) {
    return Response.json(
      { error: "invalid_request", error_description: "Missing code or code_verifier" },
      { status: 400 },
    );
  }

  // Exchange auth code
  const stored = await exchangeAuthCode(code);
  if (!stored) {
    return Response.json(
      { error: "invalid_grant", error_description: "Invalid or expired authorization code" },
      { status: 400 },
    );
  }

  // Verify PKCE
  if (!verifyPkce(codeVerifier, stored.codeChallenge)) {
    return Response.json(
      { error: "invalid_grant", error_description: "PKCE verification failed" },
      { status: 400 },
    );
  }

  return Response.json({
    access_token: stored.accessToken,
    refresh_token: stored.refreshToken,
    token_type: "Bearer",
    expires_in: 3600,
  });
}

async function handleRefreshToken(body: FormData) {
  const refreshToken = body.get("refresh_token") as string;

  if (!refreshToken) {
    return Response.json(
      { error: "invalid_request", error_description: "Missing refresh_token" },
      { status: 400 },
    );
  }

  // Use Supabase to refresh the session
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    return Response.json(
      { error: "invalid_grant", error_description: error?.message || "Refresh failed" },
      { status: 400 },
    );
  }

  return Response.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    token_type: "Bearer",
    expires_in: 3600,
  });
}
```

**Step 2: Verify all OAuth endpoints respond**

```bash
bun dev &
# Test metadata discovery
curl http://localhost:3000/.well-known/oauth-authorization-server
# Should return JSON with authorization_endpoint, token_endpoint, etc.
```

**Step 3: Commit**

```bash
git add app/oauth/token/
git commit -m "feat: add OAuth token endpoint with PKCE verification and refresh support"
```

---

### Task 7: Markdown → Tiptap Converter

**Files:**
- Create: `lib/markdown-to-tiptap.ts`

**Step 1: Create the converter** (`lib/markdown-to-tiptap.ts`)

Converts Markdown to Tiptap-compatible JSON using unified/remark-parse to parse into mdast, then transforms mdast nodes into Tiptap nodes.

```typescript
import { unified } from "unified";
import remarkParse from "remark-parse";

type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: TiptapMark[];
  text?: string;
};

type TiptapMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

/**
 * Convert Markdown string to Tiptap JSON document.
 */
export function markdownToTiptap(markdown: string): Record<string, unknown> {
  const tree = unified().use(remarkParse).parse(markdown);
  const content = convertChildren(tree.children as MdastNode[]);

  return {
    type: "doc",
    content: content.length > 0 ? content : [{ type: "paragraph" }],
  };
}

// mdast node types we handle
type MdastNode = {
  type: string;
  children?: MdastNode[];
  value?: string;
  depth?: number;
  ordered?: boolean;
  url?: string;
  alt?: string;
  title?: string;
  lang?: string;
};

function convertChildren(nodes: MdastNode[]): TiptapNode[] {
  return nodes.flatMap((node) => convertNode(node));
}

function convertNode(node: MdastNode): TiptapNode[] {
  switch (node.type) {
    case "heading":
      return [
        {
          type: "heading",
          attrs: { level: node.depth || 1 },
          content: convertInline(node.children || []),
        },
      ];

    case "paragraph": {
      const inline = convertInline(node.children || []);
      // Check if paragraph contains only an image
      if (inline.length === 1 && inline[0].type === "image") {
        return [inline[0]];
      }
      return [{ type: "paragraph", content: inline }];
    }

    case "blockquote":
      return [
        {
          type: "blockquote",
          content: convertChildren(node.children || []),
        },
      ];

    case "list":
      return [
        {
          type: node.ordered ? "orderedList" : "bulletList",
          content: (node.children || []).map((item) => ({
            type: "listItem",
            content: convertChildren(item.children || []),
          })),
        },
      ];

    case "code":
      return [
        {
          type: "codeBlock",
          attrs: { language: node.lang || null },
          content: [{ type: "text", text: node.value || "" }],
        },
      ];

    case "thematicBreak":
      return [{ type: "horizontalRule" }];

    default:
      return [];
  }
}

function convertInline(nodes: MdastNode[], marks: TiptapMark[] = []): TiptapNode[] {
  return nodes.flatMap((node) => convertInlineNode(node, marks));
}

function convertInlineNode(node: MdastNode, marks: TiptapMark[]): TiptapNode[] {
  switch (node.type) {
    case "text":
      return marks.length > 0
        ? [{ type: "text", text: node.value || "", marks: [...marks] }]
        : [{ type: "text", text: node.value || "" }];

    case "strong":
      return convertInline(node.children || [], [
        ...marks,
        { type: "bold" },
      ]);

    case "emphasis":
      return convertInline(node.children || [], [
        ...marks,
        { type: "italic" },
      ]);

    case "delete":
      return convertInline(node.children || [], [
        ...marks,
        { type: "strike" },
      ]);

    case "inlineCode":
      return [
        {
          type: "text",
          text: node.value || "",
          marks: [...marks, { type: "code" }],
        },
      ];

    case "link":
      return convertInline(node.children || [], [
        ...marks,
        {
          type: "link",
          attrs: { href: node.url || "", target: "_blank" },
        },
      ]);

    case "image":
      return [
        {
          type: "image",
          attrs: {
            src: node.url || "",
            alt: node.alt || null,
            title: node.title || null,
          },
        },
      ];

    case "break":
      return [{ type: "hardBreak" }];

    default:
      return [];
  }
}
```

**Step 2: Quick smoke test**

```bash
cd /Users/loki/mcp-ai
# Create a quick test script
cat > /tmp/test-md.ts << 'EOF'
import { markdownToTiptap } from "./lib/markdown-to-tiptap";
const result = markdownToTiptap("# Hello\n\nThis is **bold** and *italic*.\n\n- Item 1\n- Item 2");
console.log(JSON.stringify(result, null, 2));
EOF
bunx tsx /tmp/test-md.ts
# Should output valid Tiptap JSON with heading, paragraph with marks, and bulletList
```

**Step 3: Commit**

```bash
git add lib/markdown-to-tiptap.ts
git commit -m "feat: add Markdown to Tiptap JSON converter"
```

---

### Task 8: Image Upload Tool

**Files:**
- Create: `lib/tools/images.ts`

**Step 1: Create the image upload tool** (`lib/tools/images.ts`)

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

const BUCKET = "announcement-images";
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const CATEGORY_PREFIXES: Record<string, string> = {
  announcement: "",
  recruitment: "recruitment/",
  result: "results/",
  event: "events/",
  carousel: "carousel/",
  organization: "organization/",
};

export function registerImageTools(server: McpServer, supabase: SupabaseClient) {
  server.registerTool(
    "upload_image",
    {
      description:
        "Upload an image to storage. Returns the public URL. Use this before creating content that needs images.",
      inputSchema: z.object({
        image: z.string().describe("Base64-encoded image data"),
        filename: z.string().describe("Original filename (e.g., 'photo.jpg')"),
        content_type: z
          .enum(["image/jpeg", "image/png", "image/webp", "image/gif"])
          .describe("MIME type of the image"),
        category: z
          .enum([
            "announcement",
            "recruitment",
            "result",
            "event",
            "carousel",
            "organization",
          ])
          .describe("Category determines storage path prefix"),
      }),
    },
    async ({ image, filename, content_type, category }) => {
      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.includes(content_type)) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: false,
                error: `Unsupported image type: ${content_type}. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`,
              }),
            },
          ],
          isError: true,
        };
      }

      // Decode base64
      const buffer = Buffer.from(image, "base64");

      // Validate size
      if (buffer.byteLength > MAX_SIZE_BYTES) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: false,
                error: `Image too large: ${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB. Max: 5MB`,
              }),
            },
          ],
          isError: true,
        };
      }

      // Generate storage path
      const ext = filename.split(".").pop() || "jpg";
      const prefix = CATEGORY_PREFIXES[category] || "";
      const path = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      // Upload
      const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
        contentType: content_type,
        cacheControl: "3600",
        upsert: false,
      });

      if (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ success: false, error: error.message }),
            },
          ],
          isError: true,
        };
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ success: true, data: { url: publicUrl, path } }),
          },
        ],
      };
    },
  );
}
```

**Step 2: Commit**

```bash
git add lib/tools/images.ts
git commit -m "feat: add upload_image MCP tool"
```

---

### Task 9: Announcement Tools

**Files:**
- Create: `lib/tools/announcements.ts`

**Step 1: Create announcement tools** (`lib/tools/announcements.ts`)

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { markdownToTiptap } from "@/lib/markdown-to-tiptap";

function processContent(
  content: string | Record<string, unknown>,
  format: string,
): Record<string, unknown> {
  if (format === "tiptap") {
    return typeof content === "string" ? JSON.parse(content) : content;
  }
  // Default: markdown
  if (typeof content !== "string") {
    throw new Error("Markdown format requires content to be a string");
  }
  return markdownToTiptap(content);
}

export function registerAnnouncementTools(
  server: McpServer,
  supabase: SupabaseClient,
  userId: string,
) {
  server.registerTool(
    "list_announcements",
    {
      description: "List announcements with optional filters.",
      inputSchema: z.object({
        event_id: z.string().optional().describe("Filter by event ID. Omit for global announcements."),
        status: z.enum(["draft", "published"]).optional().describe("Filter by status"),
        category: z.string().optional().describe("Filter by category"),
        limit: z.number().int().min(1).max(100).optional().describe("Max results (default 20)"),
        offset: z.number().int().min(0).optional().describe("Offset for pagination"),
      }),
    },
    async ({ event_id, status, category, limit, offset }) => {
      let query = supabase
        .from("announcements")
        .select("id, title, category, date, status, event_id, author_id, created_at")
        .order("date", { ascending: false })
        .limit(limit || 20);

      if (offset) query = query.range(offset, offset + (limit || 20) - 1);
      if (event_id) query = query.eq("event_id", event_id);
      else query = query.is("event_id", null);
      if (status) query = query.eq("status", status);
      if (category) query = query.eq("category", category);

      const { data, error } = await query;

      if (error) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message }) }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }) }],
      };
    },
  );

  server.registerTool(
    "get_announcement",
    {
      description: "Get a single announcement by ID, including full content.",
      inputSchema: z.object({
        id: z.string().describe("Announcement ID"),
      }),
    },
    async ({ id }) => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message }) }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }) }],
      };
    },
  );

  server.registerTool(
    "create_announcement",
    {
      description: "Create a new announcement.",
      inputSchema: z.object({
        title: z.string().describe("Announcement title"),
        content: z.string().describe("Content in markdown (default) or Tiptap JSON"),
        content_format: z
          .enum(["markdown", "tiptap"])
          .optional()
          .describe("Content format (default: markdown)"),
        category: z.string().describe("Category (e.g., 'news', 'event')"),
        date: z.string().describe("Publication date (YYYY-MM-DD)"),
        status: z
          .enum(["draft", "published"])
          .optional()
          .describe("Status (default: draft)"),
        event_id: z.string().optional().describe("Associated event ID, or omit for global"),
      }),
    },
    async ({ title, content, content_format, category, date, status, event_id }) => {
      try {
        const tiptapContent = processContent(content, content_format || "markdown");

        const { data, error } = await supabase
          .from("announcements")
          .insert({
            title,
            content: tiptapContent,
            category,
            date,
            status: status || "draft",
            event_id: event_id || null,
            author_id: userId,
          })
          .select()
          .single();

        if (error) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message }) }],
            isError: true,
          };
        }

        return {
          content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }) }],
        };
      } catch (e) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ success: false, error: String(e) }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "update_announcement",
    {
      description: "Update an existing announcement.",
      inputSchema: z.object({
        id: z.string().describe("Announcement ID"),
        title: z.string().optional(),
        content: z.string().optional().describe("Content in markdown or Tiptap JSON"),
        content_format: z.enum(["markdown", "tiptap"]).optional(),
        category: z.string().optional(),
        date: z.string().optional(),
        status: z.enum(["draft", "published"]).optional(),
      }),
    },
    async ({ id, title, content, content_format, category, date, status }) => {
      try {
        const updates: Record<string, unknown> = {};
        if (title !== undefined) updates.title = title;
        if (category !== undefined) updates.category = category;
        if (date !== undefined) updates.date = date;
        if (status !== undefined) updates.status = status;
        if (content !== undefined) {
          updates.content = processContent(content, content_format || "markdown");
        }

        if (Object.keys(updates).length === 0) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: "No fields to update" }) }],
            isError: true,
          };
        }

        const { data, error } = await supabase
          .from("announcements")
          .update(updates)
          .eq("id", id)
          .select()
          .single();

        if (error) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message }) }],
            isError: true,
          };
        }

        return {
          content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }) }],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: String(e) }) }],
          isError: true,
        };
      }
    },
  );
}
```

**Step 2: Commit**

```bash
git add lib/tools/announcements.ts
git commit -m "feat: add announcement MCP tools (list, get, create, update)"
```

---

### Task 10: Result Tools

**Files:**
- Create: `lib/tools/results.ts`

**Step 1: Create result tools** (`lib/tools/results.ts`)

Same pattern as announcements. Key differences: `summary` field, `type` (personal/team), `team_id`, `header_image`.

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { markdownToTiptap } from "@/lib/markdown-to-tiptap";

function processContent(
  content: string | Record<string, unknown>,
  format: string,
): Record<string, unknown> {
  if (format === "tiptap") {
    return typeof content === "string" ? JSON.parse(content) : content;
  }
  if (typeof content !== "string") {
    throw new Error("Markdown format requires content to be a string");
  }
  return markdownToTiptap(content);
}

export function registerResultTools(
  server: McpServer,
  supabase: SupabaseClient,
  userId: string,
) {
  server.registerTool(
    "list_results",
    {
      description: "List results with optional filters.",
      inputSchema: z.object({
        event_id: z.string().optional().describe("Filter by event ID"),
        status: z.enum(["draft", "published"]).optional(),
        type: z.enum(["personal", "team"]).optional(),
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional(),
      }),
    },
    async ({ event_id, status, type, limit, offset }) => {
      let query = supabase
        .from("results")
        .select("id, title, date, summary, status, type, author_id, team_id, event_id, pinned, header_image, created_at")
        .order("date", { ascending: false })
        .limit(limit || 20);

      if (offset) query = query.range(offset, offset + (limit || 20) - 1);
      if (event_id) query = query.eq("event_id", event_id);
      if (status) query = query.eq("status", status);
      if (type) query = query.eq("type", type);

      const { data, error } = await query;
      if (error) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message }) }], isError: true };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }) }] };
    },
  );

  server.registerTool(
    "get_result",
    {
      description: "Get a single result by ID, including full content.",
      inputSchema: z.object({ id: z.string() }),
    },
    async ({ id }) => {
      const { data, error } = await supabase.from("results").select("*").eq("id", id).single();
      if (error) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message }) }], isError: true };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }) }] };
    },
  );

  server.registerTool(
    "create_result",
    {
      description: "Create a new result.",
      inputSchema: z.object({
        title: z.string(),
        summary: z.string().describe("Short summary text"),
        content: z.string().describe("Full content in markdown or Tiptap JSON"),
        content_format: z.enum(["markdown", "tiptap"]).optional(),
        date: z.string().describe("Date (YYYY-MM-DD)"),
        type: z.enum(["personal", "team"]),
        status: z.enum(["draft", "published"]).optional(),
        event_id: z.string().optional(),
        team_id: z.string().optional().describe("Required if type is 'team'"),
        header_image: z.string().optional().describe("URL of header image (use upload_image first)"),
      }),
    },
    async ({ title, summary, content, content_format, date, type, status, event_id, team_id, header_image }) => {
      try {
        const tiptapContent = processContent(content, content_format || "markdown");
        const { data, error } = await supabase
          .from("results")
          .insert({
            title,
            summary,
            content: tiptapContent,
            date,
            type,
            status: status || "draft",
            event_id: event_id || null,
            team_id: team_id || null,
            header_image: header_image || null,
            author_id: userId,
            pinned: false,
          })
          .select()
          .single();

        if (error) {
          return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message }) }], isError: true };
        }
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }) }] };
      } catch (e) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: String(e) }) }], isError: true };
      }
    },
  );

  server.registerTool(
    "update_result",
    {
      description: "Update an existing result.",
      inputSchema: z.object({
        id: z.string(),
        title: z.string().optional(),
        summary: z.string().optional(),
        content: z.string().optional(),
        content_format: z.enum(["markdown", "tiptap"]).optional(),
        date: z.string().optional(),
        status: z.enum(["draft", "published"]).optional(),
        header_image: z.string().optional(),
      }),
    },
    async ({ id, title, summary, content, content_format, date, status, header_image }) => {
      try {
        const updates: Record<string, unknown> = {};
        if (title !== undefined) updates.title = title;
        if (summary !== undefined) updates.summary = summary;
        if (date !== undefined) updates.date = date;
        if (status !== undefined) updates.status = status;
        if (header_image !== undefined) updates.header_image = header_image;
        if (content !== undefined) {
          updates.content = processContent(content, content_format || "markdown");
        }

        if (Object.keys(updates).length === 0) {
          return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: "No fields to update" }) }], isError: true };
        }

        const { data, error } = await supabase.from("results").update(updates).eq("id", id).select().single();
        if (error) {
          return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message }) }], isError: true };
        }
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }) }] };
      } catch (e) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: String(e) }) }], isError: true };
      }
    },
  );
}
```

**Step 2: Commit**

```bash
git add lib/tools/results.ts
git commit -m "feat: add result MCP tools (list, get, create, update)"
```

---

### Task 11: Recruitment Tools

**Files:**
- Create: `lib/tools/recruitment.ts`

**Step 1: Create recruitment tools** (`lib/tools/recruitment.ts`)

DB table is `competitions`. Has complex nested fields: `positions` (JSON array), `application_method` (JSON), `contact` (JSON).

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

const positionSchema = z.object({
  name: z.string(),
  location: z.string().optional(),
  type: z.enum(["full_time", "internship", "part_time", "remote"]),
  count: z.number().int().min(1),
  salary: z.string().optional(),
  responsibilities: z.string().optional(),
  requirements: z.string().optional(),
  nice_to_have: z.string().optional(),
});

const applicationMethodSchema = z.object({
  email: z.string().optional(),
  url: z.string().optional(),
  other: z.string().optional(),
});

const contactInfoSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
});

export function registerRecruitmentTools(
  server: McpServer,
  supabase: SupabaseClient,
) {
  server.registerTool(
    "list_recruitments",
    {
      description: "List recruitment postings.",
      inputSchema: z.object({
        event_id: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional(),
      }),
    },
    async ({ event_id, limit, offset }) => {
      let query = supabase
        .from("competitions")
        .select("id, title, link, image, start_date, end_date, event_id, created_at")
        .order("created_at", { ascending: false })
        .limit(limit || 20);

      if (offset) query = query.range(offset, offset + (limit || 20) - 1);
      if (event_id) query = query.eq("event_id", event_id);
      else query = query.is("event_id", null);

      const { data, error } = await query;
      if (error) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message }) }], isError: true };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }) }] };
    },
  );

  server.registerTool(
    "get_recruitment",
    {
      description: "Get a single recruitment posting with full details.",
      inputSchema: z.object({ id: z.string() }),
    },
    async ({ id }) => {
      const { data, error } = await supabase.from("competitions").select("*").eq("id", id).single();
      if (error) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message }) }], isError: true };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }) }] };
    },
  );

  server.registerTool(
    "create_recruitment",
    {
      description: "Create a new recruitment posting.",
      inputSchema: z.object({
        title: z.string(),
        link: z.string().describe("External application URL"),
        image: z.string().optional().describe("Card image URL (use upload_image first)"),
        company_description: z.string().optional(),
        start_date: z.string().describe("Start date (YYYY-MM-DD)"),
        end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
        positions: z.array(positionSchema).optional(),
        application_method: applicationMethodSchema.optional(),
        contact: contactInfoSchema.optional(),
        required_documents: z.string().optional(),
        event_id: z.string().optional(),
      }),
    },
    async (params) => {
      const { data, error } = await supabase
        .from("competitions")
        .insert({
          title: params.title,
          link: params.link,
          image: params.image || null,
          company_description: params.company_description || null,
          start_date: params.start_date,
          end_date: params.end_date || null,
          positions: params.positions || null,
          application_method: params.application_method || null,
          contact: params.contact || null,
          required_documents: params.required_documents || null,
          event_id: params.event_id || null,
        })
        .select()
        .single();

      if (error) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message }) }], isError: true };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }) }] };
    },
  );

  server.registerTool(
    "update_recruitment",
    {
      description: "Update an existing recruitment posting.",
      inputSchema: z.object({
        id: z.string(),
        title: z.string().optional(),
        link: z.string().optional(),
        image: z.string().optional(),
        company_description: z.string().optional(),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        positions: z.array(positionSchema).optional(),
        application_method: applicationMethodSchema.optional(),
        contact: contactInfoSchema.optional(),
        required_documents: z.string().optional(),
      }),
    },
    async ({ id, ...fields }) => {
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) updates[key] = value;
      }

      if (Object.keys(updates).length === 0) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: "No fields to update" }) }], isError: true };
      }

      const { data, error } = await supabase.from("competitions").update(updates).eq("id", id).select().single();
      if (error) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message }) }], isError: true };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }) }] };
    },
  );
}
```

**Step 2: Commit**

```bash
git add lib/tools/recruitment.ts
git commit -m "feat: add recruitment MCP tools (list, get, create, update)"
```

---

### Task 12: Event Tools

**Files:**
- Create: `lib/tools/events.ts`

**Step 1: Create event tools** (`lib/tools/events.ts`)

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

export function registerEventTools(server: McpServer, supabase: SupabaseClient) {
  server.registerTool(
    "list_events",
    {
      description: "List events with optional filters.",
      inputSchema: z.object({
        status: z.enum(["draft", "published"]).optional(),
        pinned: z.boolean().optional(),
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional(),
      }),
    },
    async ({ status, pinned, limit, offset }) => {
      let query = supabase
        .from("events")
        .select("*")
        .order("sort_order", { ascending: true })
        .limit(limit || 20);

      if (offset) query = query.range(offset, offset + (limit || 20) - 1);
      if (status) query = query.eq("status", status);
      if (pinned !== undefined) query = query.eq("pinned", pinned);

      const { data, error } = await query;
      if (error) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message }) }], isError: true };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }) }] };
    },
  );

  server.registerTool(
    "get_event",
    {
      description: "Get a single event by ID or slug.",
      inputSchema: z.object({
        id: z.string().optional().describe("Event UUID"),
        slug: z.string().optional().describe("Event slug (alternative to id)"),
      }),
    },
    async ({ id, slug }) => {
      if (!id && !slug) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: "Provide either id or slug" }) }], isError: true };
      }

      let query = supabase.from("events").select("*");
      if (id) query = query.eq("id", id);
      else if (slug) query = query.eq("slug", slug);

      const { data, error } = await query.single();
      if (error) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message }) }], isError: true };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }) }] };
    },
  );

  server.registerTool(
    "create_event",
    {
      description: "Create a new event.",
      inputSchema: z.object({
        name: z.string(),
        slug: z.string().describe("URL-friendly slug (unique)"),
        description: z.string().optional(),
        cover_image: z.string().optional().describe("Cover image URL (use upload_image first)"),
        status: z.enum(["draft", "published"]).optional(),
        pinned: z.boolean().optional(),
        sort_order: z.number().int().optional(),
      }),
    },
    async ({ name, slug, description, cover_image, status, pinned, sort_order }) => {
      const { data, error } = await supabase
        .from("events")
        .insert({
          name,
          slug,
          description: description || null,
          cover_image: cover_image || null,
          status: status || "draft",
          pinned: pinned || false,
          sort_order: sort_order || 0,
        })
        .select()
        .single();

      if (error) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message }) }], isError: true };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }) }] };
    },
  );

  server.registerTool(
    "update_event",
    {
      description: "Update an existing event.",
      inputSchema: z.object({
        id: z.string(),
        name: z.string().optional(),
        slug: z.string().optional(),
        description: z.string().optional(),
        cover_image: z.string().optional(),
        status: z.enum(["draft", "published"]).optional(),
        pinned: z.boolean().optional(),
        sort_order: z.number().int().optional(),
      }),
    },
    async ({ id, ...fields }) => {
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) updates[key] = value;
      }

      if (Object.keys(updates).length === 0) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: "No fields to update" }) }], isError: true };
      }

      const { data, error } = await supabase.from("events").update(updates).eq("id", id).select().single();
      if (error) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message }) }], isError: true };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }) }] };
    },
  );
}
```

**Step 2: Commit**

```bash
git add lib/tools/events.ts
git commit -m "feat: add event MCP tools (list, get, create, update)"
```

---

### Task 13: Contacts + Carousel + Introduction Tools

**Files:**
- Create: `lib/tools/contacts.ts`
- Create: `lib/tools/carousel.ts`
- Create: `lib/tools/introduction.ts`

These are simpler entities. Grouped into one task.

**Step 1: Create contacts tools** (`lib/tools/contacts.ts`)

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

export function registerContactTools(server: McpServer, supabase: SupabaseClient) {
  server.registerTool(
    "list_contacts",
    {
      description: "List all contacts.",
      inputSchema: z.object({}),
    },
    async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message }) }], isError: true };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }) }] };
    },
  );

  server.registerTool(
    "create_contact",
    {
      description: "Create a new contact.",
      inputSchema: z.object({
        name: z.string(),
        position: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        sort_order: z.number().int().optional(),
      }),
    },
    async ({ name, position, phone, email, sort_order }) => {
      const { data, error } = await supabase
        .from("contacts")
        .insert({
          name,
          position: position || null,
          phone: phone || null,
          email: email || null,
          sort_order: sort_order || 0,
        })
        .select()
        .single();

      if (error) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message }) }], isError: true };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }) }] };
    },
  );

  server.registerTool(
    "update_contact",
    {
      description: "Update an existing contact.",
      inputSchema: z.object({
        id: z.string(),
        name: z.string().optional(),
        position: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        sort_order: z.number().int().optional(),
      }),
    },
    async ({ id, ...fields }) => {
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) updates[key] = value;
      }
      if (Object.keys(updates).length === 0) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: "No fields to update" }) }], isError: true };
      }
      const { data, error } = await supabase.from("contacts").update(updates).eq("id", id).select().single();
      if (error) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message }) }], isError: true };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }) }] };
    },
  );
}
```

**Step 2: Create carousel tools** (`lib/tools/carousel.ts`)

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

export function registerCarouselTools(server: McpServer, supabase: SupabaseClient) {
  server.registerTool(
    "list_carousel",
    {
      description: "List all carousel slides.",
      inputSchema: z.object({}),
    },
    async () => {
      const { data, error } = await supabase
        .from("carousel")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message }) }], isError: true };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }) }] };
    },
  );

  server.registerTool(
    "create_carousel_slide",
    {
      description: "Create a new carousel slide.",
      inputSchema: z.object({
        title: z.string(),
        description: z.string().optional(),
        link: z.string().optional(),
        image: z.string().optional().describe("Image URL (use upload_image first)"),
        sort_order: z.number().int().optional(),
      }),
    },
    async ({ title, description, link, image, sort_order }) => {
      const { data, error } = await supabase
        .from("carousel")
        .insert({
          title,
          description: description || null,
          link: link || null,
          image: image || null,
          sort_order: sort_order || 0,
        })
        .select()
        .single();

      if (error) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message }) }], isError: true };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }) }] };
    },
  );

  server.registerTool(
    "update_carousel_slide",
    {
      description: "Update an existing carousel slide.",
      inputSchema: z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        link: z.string().optional(),
        image: z.string().optional(),
        sort_order: z.number().int().optional(),
      }),
    },
    async ({ id, ...fields }) => {
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) updates[key] = value;
      }
      if (Object.keys(updates).length === 0) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: "No fields to update" }) }], isError: true };
      }
      const { data, error } = await supabase.from("carousel").update(updates).eq("id", id).select().single();
      if (error) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message }) }], isError: true };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }) }] };
    },
  );
}
```

**Step 3: Create introduction tools** (`lib/tools/introduction.ts`)

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { markdownToTiptap } from "@/lib/markdown-to-tiptap";

export function registerIntroductionTools(server: McpServer, supabase: SupabaseClient) {
  server.registerTool(
    "get_introduction",
    {
      description: "Get the office introduction page content.",
      inputSchema: z.object({}),
    },
    async () => {
      const { data, error } = await supabase
        .from("introductions")
        .select("*")
        .limit(1)
        .single();

      if (error) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message }) }], isError: true };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }) }] };
    },
  );

  server.registerTool(
    "update_introduction",
    {
      description: "Update the office introduction page.",
      inputSchema: z.object({
        title: z.string().optional(),
        content: z.string().optional().describe("Content in markdown or Tiptap JSON"),
        content_format: z.enum(["markdown", "tiptap"]).optional(),
      }),
    },
    async ({ title, content, content_format }) => {
      const updates: Record<string, unknown> = {};
      if (title !== undefined) updates.title = title;
      if (content !== undefined) {
        const format = content_format || "markdown";
        if (format === "tiptap") {
          updates.content = typeof content === "string" ? JSON.parse(content) : content;
        } else {
          updates.content = markdownToTiptap(content);
        }
      }

      if (Object.keys(updates).length === 0) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: "No fields to update" }) }], isError: true };
      }

      // Introduction is a single-record table — get the first record's ID, then update
      const { data: existing } = await supabase.from("introductions").select("id").limit(1).single();
      if (!existing) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: "Introduction record not found" }) }], isError: true };
      }

      const { data, error } = await supabase.from("introductions").update(updates).eq("id", existing.id).select().single();
      if (error) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message }) }], isError: true };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }) }] };
    },
  );
}
```

**Step 4: Commit**

```bash
git add lib/tools/contacts.ts lib/tools/carousel.ts lib/tools/introduction.ts
git commit -m "feat: add contacts, carousel, and introduction MCP tools"
```

---

### Task 14: Profile Tools

**Files:**
- Create: `lib/tools/profiles.ts`

**Step 1: Create profile tools** (`lib/tools/profiles.ts`)

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

export function registerProfileTools(
  server: McpServer,
  supabase: SupabaseClient,
  userId: string,
) {
  server.registerTool(
    "get_my_profile",
    {
      description: "Get the current authenticated user's profile.",
      inputSchema: z.object({}),
    },
    async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message }) }], isError: true };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }) }] };
    },
  );

  server.registerTool(
    "update_my_profile",
    {
      description: "Update the current authenticated user's profile.",
      inputSchema: z.object({
        display_name: z.string().optional(),
        bio: z.string().optional(),
        phone: z.string().optional(),
        linkedin: z.string().optional(),
        github: z.string().optional(),
        website: z.string().optional(),
        facebook: z.string().optional(),
      }),
    },
    async (fields) => {
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) updates[key] = value;
      }

      if (Object.keys(updates).length === 0) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: "No fields to update" }) }], isError: true };
      }

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId)
        .select()
        .single();

      if (error) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message }) }], isError: true };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }) }] };
    },
  );

  server.registerTool(
    "list_profiles",
    {
      description: "List user profiles. Admin only — will fail for non-admin users due to RLS.",
      inputSchema: z.object({
        role: z.enum(["admin", "user"]).optional(),
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional(),
      }),
    },
    async ({ role, limit, offset }) => {
      let query = supabase
        .from("profiles")
        .select("id, display_name, avatar_url, role, created_at")
        .order("created_at", { ascending: false })
        .limit(limit || 20);

      if (offset) query = query.range(offset, offset + (limit || 20) - 1);
      if (role) query = query.eq("role", role);

      const { data, error } = await query;
      if (error) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: error.message }) }], isError: true };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }) }] };
    },
  );
}
```

**Step 2: Commit**

```bash
git add lib/tools/profiles.ts
git commit -m "feat: add profile MCP tools (get_my, update_my, list)"
```

---

### Task 15: Wire All Tools into MCP Server

**Files:**
- Modify: `lib/mcp/server.ts`

**Step 1: Update server.ts to register all tools**

Replace the entire `lib/mcp/server.ts` with:

```typescript
import { McpServer } from "@modelcontextprotocol/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { registerAnnouncementTools } from "@/lib/tools/announcements";
import { registerResultTools } from "@/lib/tools/results";
import { registerRecruitmentTools } from "@/lib/tools/recruitment";
import { registerEventTools } from "@/lib/tools/events";
import { registerContactTools } from "@/lib/tools/contacts";
import { registerCarouselTools } from "@/lib/tools/carousel";
import { registerIntroductionTools } from "@/lib/tools/introduction";
import { registerProfileTools } from "@/lib/tools/profiles";
import { registerImageTools } from "@/lib/tools/images";

export function createMcpServer(supabase: SupabaseClient, userId: string) {
  const server = new McpServer({
    name: "nycu-ai-office",
    version: "0.1.0",
  });

  // Register all tool groups
  registerAnnouncementTools(server, supabase, userId);
  registerResultTools(server, supabase, userId);
  registerRecruitmentTools(server, supabase);
  registerEventTools(server, supabase);
  registerContactTools(server, supabase);
  registerCarouselTools(server, supabase);
  registerIntroductionTools(server, supabase);
  registerProfileTools(server, supabase, userId);
  registerImageTools(server, supabase);

  return server;
}
```

**Step 2: Verify build**

```bash
cd /Users/loki/mcp-ai
bun build
# Should complete without errors
```

**Step 3: Commit**

```bash
git add lib/mcp/server.ts
git commit -m "feat: wire all 28 MCP tools into server"
```

---

### Task 16: Integration Test with MCP Inspector

**Files:**
- Create: `.env.local` (manual, with real credentials)

**Step 1: Create .env.local with real Supabase credentials**

Copy from main site and adjust:

```bash
cd /Users/loki/mcp-ai
# Copy values from the main site's .env.local
# NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY should be the same
# KV_REST_API_URL and KV_REST_API_TOKEN need to be set up in Vercel dashboard
```

For local testing without Vercel KV, you can use a mock or skip OAuth and test the MCP endpoint directly with a Supabase token.

**Step 2: Start dev server**

```bash
cd /Users/loki/mcp-ai
bun dev
```

**Step 3: Test MCP endpoint directly with curl**

Get a Supabase access token first (e.g., from browser dev tools on ai.winlab.tw, or via Supabase CLI):

```bash
# Test the ping tool (replace TOKEN with actual Supabase JWT)
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'

# Should return server capabilities

# Then call a tool
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

# Should return all 28 tools
```

**Step 4: Test with MCP Inspector (optional, if npx available)**

```bash
npx @modelcontextprotocol/inspector
# Configure it to connect to http://localhost:3000/mcp with Bearer token
# Verify tools list, try calling list_announcements, etc.
```

**Step 5: Test OAuth flow end-to-end**

```bash
# 1. Check metadata
curl http://localhost:3000/.well-known/oauth-authorization-server

# 2. Open authorize page in browser
# http://localhost:3000/oauth/authorize?client_id=test&redirect_uri=http://localhost:3001/callback&code_challenge=TEST_CHALLENGE&code_challenge_method=S256&state=test123

# 3. Login and verify redirect with auth code
# 4. Exchange code at /oauth/token
```

**Step 6: Commit .env.local.example update if needed**

```bash
git add -A
git commit -m "chore: finalize project setup and verify all tools"
```

---

### Task 17: Vercel Deployment

**Files:**
- Create: `vercel.json` (if needed)
- Configure: Vercel project settings

**Step 1: Create vercel.json** (minimal, may not be needed)

```json
{
  "framework": "nextjs"
}
```

**Step 2: Deploy to Vercel**

```bash
cd /Users/loki/mcp-ai
# Link to Vercel (first time)
bunx vercel link
# Set environment variables in Vercel dashboard:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - KV_REST_API_URL (create Vercel KV store first)
# - KV_REST_API_TOKEN
# - NEXT_PUBLIC_BASE_URL=https://mcp.ai.winlab.tw

# Deploy
bunx vercel --prod
```

**Step 3: Configure custom domain**

In Vercel dashboard: Settings → Domains → Add `mcp.ai.winlab.tw`
Then update DNS to point to Vercel.

**Step 4: Verify production deployment**

```bash
curl https://mcp.ai.winlab.tw/.well-known/oauth-authorization-server
# Should return OAuth metadata with production URLs
```

**Step 5: Commit deployment config**

```bash
git add vercel.json
git commit -m "chore: add Vercel deployment config"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Project scaffold | package.json, tsconfig, next.config, layout, page |
| 2 | Supabase client setup | lib/supabase/{types,client,server}.ts |
| 3 | MCP endpoint + adapter | lib/mcp/{adapter,server}.ts, app/mcp/route.ts |
| 4 | OAuth metadata + PKCE + KV | lib/auth/*, app/.well-known/* |
| 5 | OAuth authorize page | app/oauth/authorize/page.tsx, callback/route.ts |
| 6 | OAuth token endpoint | app/oauth/token/route.ts |
| 7 | Markdown → Tiptap | lib/markdown-to-tiptap.ts |
| 8 | Image upload tool | lib/tools/images.ts |
| 9 | Announcement tools | lib/tools/announcements.ts |
| 10 | Result tools | lib/tools/results.ts |
| 11 | Recruitment tools | lib/tools/recruitment.ts |
| 12 | Event tools | lib/tools/events.ts |
| 13 | Contacts + Carousel + Intro | lib/tools/{contacts,carousel,introduction}.ts |
| 14 | Profile tools | lib/tools/profiles.ts |
| 15 | Wire all tools | lib/mcp/server.ts |
| 16 | Integration test | Manual testing with curl / MCP Inspector |
| 17 | Vercel deployment | vercel.json, domain config |
