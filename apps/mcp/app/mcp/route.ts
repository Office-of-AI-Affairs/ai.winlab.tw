import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "@/lib/mcp/server";
import { getProtectedResourceMetadataUrl } from "@/lib/auth/urls";
import { verifyMcpToken } from "@/lib/auth/jwt";
import { createClientWithToken } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return Response.json(
      { error: "Missing Authorization header" },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": `Bearer resource_metadata="${getProtectedResourceMetadataUrl()}"`,
        },
      }
    );
  }

  const claims = await verifyMcpToken(token);
  if (!claims) {
    return Response.json(
      { error: "Invalid or expired token" },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": `Bearer resource_metadata="${getProtectedResourceMetadataUrl()}"`,
        },
      }
    );
  }

  const supabase = createClientWithToken(token);
  const server = createMcpServer(supabase, claims.sub, token);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);

  return transport.handleRequest(request);
}

export async function GET() {
  return Response.json(
    { error: "SSE not supported in stateless mode" },
    { status: 405 }
  );
}

export async function DELETE() {
  return Response.json(
    { error: "Sessions not supported in stateless mode" },
    { status: 405 }
  );
}
