import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  addRecruitmentOwner,
  getRecruitmentRecord,
  listRecruitmentOwners,
  patchRecruitment,
  removeRecruitmentOwner,
  saveRecruitment,
} from "@/lib/actions/recruitment";
import { listRows } from "@/lib/actions/rows";
import { normalizeApplicationMethod, resolveRecruitmentLink } from "@/lib/mcp/recruitment-links";
import { answer, defined, error, page, success } from "@/lib/mcp/tools/common";
import { composeRecruitment } from "@winlab/domain";
import type { RecruitmentPrivateDetails, RecruitmentSummary } from "@winlab/db";

const positionSchema = z.object({
  name: z.string(),
  location: z.string().optional(),
  type: z.enum(["full_time", "internship", "part_time", "remote"]),
  count: z.number().int().positive(),
  salary: z.string().optional(),
  responsibilities: z.string().optional(),
  requirements: z.string().optional(),
  nice_to_have: z.string().optional(),
});

const applicationMethodLinkSchema = z.object({
  label: z.string(),
  url: z.string(),
});

const applicationMethodSchema = z.object({
  email: z.string().optional(),
  url: z.string().optional(),
  links: z.array(applicationMethodLinkSchema).optional(),
  other: z.string().optional(),
});

const contactSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
});

const LIST_COLUMNS = [
  "id", "created_at", "updated_at", "title", "link", "image", "company_description", "start_date", "end_date", "event_id",
];

async function composed(id: string) {
  const record = await getRecruitmentRecord(id);
  if (!record) return error("Not found");
  return success(
    composeRecruitment(record.summary as RecruitmentSummary, record.details as RecruitmentPrivateDetails | null),
  );
}

export function registerRecruitmentTools(server: McpServer) {
  server.tool(
    "list_recruitments",
    {
      event_id: z.string().uuid().optional(),
      limit: z.number().int().positive().optional(),
      offset: z.number().int().nonnegative().optional(),
    },
    async ({ event_id, limit, offset }) => {
      const rows = await listRows("competitions", { event_id: event_id ?? null }, [{ column: "created_at", ascending: false }]);
      return success(page(rows, LIST_COLUMNS, limit, offset));
    },
  );

  server.tool("get_recruitment", { id: z.string().uuid() }, async ({ id }) => composed(id));

  server.tool(
    "create_recruitment",
    {
      title: z.string(),
      link: z.string().optional(),
      image: z.string().optional(),
      company_description: z.string().optional(),
      start_date: z.string(),
      end_date: z.string().optional(),
      positions: z.array(positionSchema).optional(),
      application_method: applicationMethodSchema.optional(),
      contact: contactSchema.optional(),
      required_documents: z.string().optional(),
      event_id: z.string().uuid().optional(),
    },
    async ({ link, positions, application_method, contact, required_documents, event_id, ...rest }) => {
      const method = normalizeApplicationMethod(application_method) ?? null;
      const result = await saveRecruitment({
        id: null,
        eventId: event_id ?? null,
        public: { ...rest, link: resolveRecruitmentLink(link, method) },
        private: { positions, application_method: method, contact, required_documents },
      });
      if (!result.ok) return error(result.error);
      return composed(result.id!);
    },
  );

  server.tool(
    "update_recruitment",
    {
      id: z.string().uuid(),
      title: z.string().optional(),
      link: z.string().optional(),
      image: z.string().optional(),
      company_description: z.string().optional(),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      positions: z.array(positionSchema).optional(),
      application_method: applicationMethodSchema.optional(),
      contact: contactSchema.optional(),
      required_documents: z.string().optional(),
      event_id: z.string().uuid().optional(),
    },
    async ({ id, link, positions, application_method, contact, required_documents, ...rest }) => {
      const method = application_method !== undefined ? normalizeApplicationMethod(application_method) : undefined;
      const publicPatch: Record<string, unknown> = defined(rest);
      if (link !== undefined || method !== undefined) publicPatch.link = resolveRecruitmentLink(link, method ?? null);
      const privatePatch: Record<string, unknown> = defined({ positions, contact, required_documents });
      if (application_method !== undefined) privatePatch.application_method = method;
      if (Object.keys(publicPatch).length === 0 && Object.keys(privatePatch).length === 0) {
        return error("No fields to update");
      }
      const result = await patchRecruitment(id, publicPatch, privatePatch);
      if (!result.ok) return error(result.error);
      return composed(id);
    },
  );

  // Owner management is admin-only.
  server.tool("list_recruitment_owners", { recruitment_id: z.string().uuid() }, async ({ recruitment_id }) => {
    try {
      return success(await listRecruitmentOwners(recruitment_id));
    } catch {
      return error("Forbidden");
    }
  });

  server.tool(
    "add_recruitment_owner",
    { recruitment_id: z.string().uuid(), user_id: z.string().uuid() },
    async ({ recruitment_id, user_id }) => {
      try {
        return answer(await addRecruitmentOwner(recruitment_id, user_id));
      } catch {
        return error("Forbidden");
      }
    },
  );

  server.tool(
    "remove_recruitment_owner",
    { recruitment_id: z.string().uuid(), user_id: z.string().uuid() },
    async ({ recruitment_id, user_id }) => {
      try {
        return answer(await removeRecruitmentOwner(recruitment_id, user_id));
      } catch {
        return error("Forbidden");
      }
    },
  );
}
