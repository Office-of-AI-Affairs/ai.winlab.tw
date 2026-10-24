const DEFAULT_BASE_URL = "https://ai.winlab.tw";

// The MCP server lived at mcp.ai.winlab.tw until 2026-10. That host still
// serves the API (next.config.ts only redirects its other paths), so clients
// configured with the old URL keep authorizing against their old resource.
export const LEGACY_MCP_RESOURCE_URL = "https://mcp.ai.winlab.tw/mcp";

export function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
}

export function getMcpResourceUrl(baseUrl = getBaseUrl()) {
  return `${baseUrl}/mcp`;
}

export function getProtectedResourceMetadataUrl(baseUrl = getBaseUrl()) {
  return `${baseUrl}/.well-known/oauth-protected-resource/mcp`;
}
