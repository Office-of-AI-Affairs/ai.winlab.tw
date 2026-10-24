import { requireMcpAuth } from "@better-auth/mcp";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { auth, mcpResource } from "@/lib/auth";
import { tokenRevoked } from "@/lib/auth/revoke";
import { runAsViewer, viewerById } from "@/lib/auth/viewer";
import { createMcpServer } from "@/lib/mcp/server";

export const dynamic = "force-dynamic";

// The signing keys come from this same server over loopback, not through
// the public gateway; Better Auth caches them for 5 minutes either way.
const jwksUrl = `http://127.0.0.1:${process.env.PORT ?? 3000}/api/auth/jwks`;

// Every other /mcp error is JSON-RPC, so a refusal is too.
const refuse = (status: number, message: string) =>
  Response.json({ jsonrpc: "2.0", error: { code: -32000, message }, id: null }, { status });

// Better Auth checks the bearer token (JWKS signature, issuer, audience,
// expiry) and answers 401 with the RFC 9728 challenge. The token's sub is
// the user every tool acts as, with the same permission checks as the site.
export const POST = requireMcpAuth(
  auth,
  async (request, claims) => {
    // A client_credentials token names the client, not a user.
    const clientId = String(claims.azp ?? claims.client_id ?? "");
    if (!claims.sub || claims.sub === clientId) return refuse(403, "not a user token");
    const viewer = await viewerById(claims.sub);
    if (!viewer) return refuse(403, "account no longer exists");
    if (await tokenRevoked(claims.sub, claims.iat)) return refuse(401, "token revoked; sign in again");
    return runAsViewer(viewer, async () => {
      const server = createMcpServer(viewer);
      const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await server.connect(transport);
      return transport.handleRequest(request);
    });
  },
  { resource: mcpResource, jwksUrl },
);

export async function GET() {
  return Response.json({ error: "SSE not supported in stateless mode" }, { status: 405 });
}

export async function DELETE() {
  return Response.json({ error: "Sessions not supported in stateless mode" }, { status: 405 });
}
