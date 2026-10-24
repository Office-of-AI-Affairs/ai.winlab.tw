import { getOAuthMetadata } from "@/lib/mcp/auth/oauth-metadata";
import { getBaseUrl } from "@/lib/mcp/auth/urls";

export async function GET() {
  return Response.json(getOAuthMetadata(getBaseUrl()));
}
