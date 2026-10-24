import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";

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

export function createMcpServer(supabase: SupabaseClient, userId: string) {
  const server = new McpServer({
    name: "nycu-ai-office",
    version: "0.1.0",
  });

  // Register all tool groups
  registerImageTools(server, supabase, userId);
  registerAnnouncementTools(server, supabase, userId);
  registerInsightTools(server, supabase, userId);
  registerResultTools(server, supabase, userId);
  registerRecruitmentTools(server, supabase, userId);
  registerEventTools(server, supabase);
  registerContactTools(server, supabase);
  registerCarouselTools(server, supabase);
  registerIntroductionTools(server, supabase);
  registerProfileTools(server, supabase, userId);
  registerUserTools(server, supabase);

  return server;
}
