const DEFAULT_BASE_URL = "https://ai.winlab.tw";

// The MCP server lived at mcp.ai.winlab.tw until 2026-10. That host still
// serves the API and its discovery (next.config.ts only redirects its other
// paths). MCP clients check that the advertised resource matches the URL they
// were configured with, so the old host answers with its own base URL.
const LEGACY_HOST = "mcp.ai.winlab.tw";
const LEGACY_BASE_URL = `https://${LEGACY_HOST}`;
export const LEGACY_MCP_RESOURCE_URL = `${LEGACY_BASE_URL}/mcp`;

export function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
}

/** Base URL for a request: the old host keeps its own, every other host gets the canonical one. */
export function getBaseUrlFor(request?: Request) {
  const host = request?.headers.get("host")?.split(":")[0].toLowerCase();
  return host === LEGACY_HOST ? LEGACY_BASE_URL : getBaseUrl();
}

export function getMcpResourceUrl(baseUrl = getBaseUrl()) {
  return `${baseUrl}/mcp`;
}

export function getProtectedResourceMetadataUrl(baseUrl = getBaseUrl()) {
  return `${baseUrl}/.well-known/oauth-protected-resource/mcp`;
}
