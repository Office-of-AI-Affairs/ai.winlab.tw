import { getProtectedResourceMetadata } from "@/lib/mcp/auth/protected-resource-metadata";
import { getBaseUrl } from "@/lib/mcp/auth/urls";

export async function GET() {
  return Response.json(getProtectedResourceMetadata(getBaseUrl()));
}
