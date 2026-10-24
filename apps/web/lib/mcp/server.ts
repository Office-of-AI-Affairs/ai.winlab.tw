import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Viewer } from "@/lib/auth/viewer";
import { registerAnnouncementTools } from "@/lib/mcp/tools/announcements";
import { registerCarouselTools } from "@/lib/mcp/tools/carousel";
import { registerContactTools } from "@/lib/mcp/tools/contacts";
import { registerEventTools } from "@/lib/mcp/tools/events";
import { registerImageTools } from "@/lib/mcp/tools/images";
import { registerInsightTools } from "@/lib/mcp/tools/insights";
import { registerIntroductionTools } from "@/lib/mcp/tools/introduction";
import { registerProfileTools } from "@/lib/mcp/tools/profiles";
import { registerRecruitmentTools } from "@/lib/mcp/tools/recruitment";
import { registerResultTools } from "@/lib/mcp/tools/results";
import { registerUserTools } from "@/lib/mcp/tools/users";

// One server per request (stateless). Tools act as `viewer`; app/mcp/route.ts
// runs them inside runAsViewer, so the site's permission checks apply.
export function createMcpServer(viewer: Viewer) {
  const server = new McpServer({ name: "nycu-ai-office", version: "0.2.0" });
  registerImageTools(server, viewer);
  registerAnnouncementTools(server, viewer);
  registerInsightTools(server, viewer);
  registerResultTools(server, viewer);
  registerRecruitmentTools(server);
  registerEventTools(server, viewer);
  registerContactTools(server);
  registerCarouselTools(server);
  registerIntroductionTools(server);
  registerProfileTools(server, viewer);
  registerUserTools(server);
  return server;
}
