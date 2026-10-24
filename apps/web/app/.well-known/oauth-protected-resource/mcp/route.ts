import { getProtectedResourceMetadata } from "@/lib/mcp/auth/protected-resource-metadata";
import { getBaseUrlFor } from "@/lib/mcp/auth/urls";

// Answers per host, so it is rendered per request.
export const dynamic = "force-dynamic";

export async function GET(request?: Request) {
  return Response.json(getProtectedResourceMetadata(getBaseUrlFor(request)));
}
