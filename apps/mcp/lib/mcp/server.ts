import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";

import { registerAnnouncementTools } from "@/lib/tools/announcements";
import { registerCarouselTools } from "@/lib/tools/carousel";
import { registerContactTools } from "@/lib/tools/contacts";
import { registerEventTools } from "@/lib/tools/events";
import { registerImageTools } from "@/lib/tools/images";
import { registerInsightTools } from "@/lib/tools/insights";
import { registerIntroductionTools } from "@/lib/tools/introduction";
import { registerProfileTools } from "@/lib/tools/profiles";
import { registerRecruitmentTools } from "@/lib/tools/recruitment";
import { registerResultTools } from "@/lib/tools/results";
import { registerUserTools } from "@/lib/tools/users";

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
