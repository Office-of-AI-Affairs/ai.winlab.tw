import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { composeRecruitment } from "@winlab/domain";
import {
  normalizeApplicationMethod,
  resolveRecruitmentLink,
} from "@/lib/recruitment-links";
import type {
  RecruitmentPrivateDetails,
  RecruitmentSummary,
} from "@winlab/db";

function success(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ success: true, data }),
      },
    ],
  };
}

function error(message: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ success: false, error: message }),
      },
    ],
    isError: true,
  };
}

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

export function registerRecruitmentTools(
  server: McpServer,
  supabase: SupabaseClient,
  userId: string
) {
  // --- list_recruitments ---
  server.tool(
    "list_recruitments",
    {
      event_id: z.string().uuid().optional(),
      limit: z.number().int().positive().optional(),
      offset: z.number().int().nonnegative().optional(),
    },
    async ({ event_id, limit, offset }) => {
      let query = supabase
        .from("competitions")
        .select(
          "id, created_at, updated_at, title, link, image, company_description, start_date, end_date, event_id"
        )
        .order("created_at", { ascending: false })
        .range(offset ?? 0, (offset ?? 0) + (limit ?? 20) - 1);

      if (event_id) {
        query = query.eq("event_id", event_id);
      } else {
        query = query.is("event_id", null);
      }

      const { data, error: dbError } = await query;

      if (dbError) {
        return error(dbError.message);
      }

      return success(data);
    }
  );

  // --- get_recruitment ---
  server.tool(
    "get_recruitment",
    {
      id: z.string().uuid(),
    },
    async ({ id }) => {
      const { data: summary, error: dbError } = await supabase
        .from("competitions")
        .select("id, created_at, updated_at, title, link, image, company_description, start_date, end_date, event_id")
        .eq("id", id)
        .single();

      if (dbError) {
        return error(dbError.message);
      }

      const { data: details, error: detailError } = await supabase
        .from("competition_private_details")
        .select("competition_id, created_at, updated_at, positions, application_method, contact, required_documents")
        .eq("competition_id", id)
        .maybeSingle();

      if (detailError) {
        return error(detailError.message);
      }

      return success(
        composeRecruitment(
          summary as RecruitmentSummary,
          (details as RecruitmentPrivateDetails | null) ?? null
        )
      );
    }
  );

  // --- create_recruitment ---
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
    async ({
      title,
      link,
      image,
      company_description,
      start_date,
      end_date,
      positions,
      application_method,
      contact,
      required_documents,
      event_id,
    }) => {
      const normalizedApplicationMethod =
        normalizeApplicationMethod(application_method) ?? null;

      const { data, error: dbError } = await supabase
        .from("competitions")
        .insert({
          title,
          link: resolveRecruitmentLink(link, normalizedApplicationMethod),
          image: image ?? null,
          company_description: company_description ?? null,
          start_date,
          end_date: end_date ?? null,
          event_id: event_id ?? null,
          created_by: userId,
        })
        .select("id, created_at, updated_at, title, link, image, company_description, start_date, end_date, event_id")
        .single();

      if (dbError) {
        return error(dbError.message);
      }

      const hasPrivateDetails = Boolean(
        positions?.length ||
        normalizedApplicationMethod ||
        contact ||
        required_documents
      );

      let details: RecruitmentPrivateDetails | null = null;
      if (hasPrivateDetails) {
        const { data: privateData, error: privateError } = await supabase
          .from("competition_private_details")
          .insert({
            competition_id: data.id,
            positions: positions ?? null,
            application_method: normalizedApplicationMethod,
            contact: contact ?? null,
            required_documents: required_documents ?? null,
          })
          .select("competition_id, created_at, updated_at, positions, application_method, contact, required_documents")
          .single();

        if (privateError) {
          return error(privateError.message);
        }

        details = privateData as RecruitmentPrivateDetails;
      }

      return success(composeRecruitment(data as RecruitmentSummary, details));
    }
  );

  // --- update_recruitment ---
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
    async ({
      id,
      title,
      link,
      image,
      company_description,
      start_date,
      end_date,
      positions,
      application_method,
      contact,
      required_documents,
      event_id,
    }) => {
      const updates: Record<string, unknown> = {};
      const normalizedApplicationMethod =
        application_method !== undefined
          ? normalizeApplicationMethod(application_method)
          : undefined;

      if (title !== undefined) updates.title = title;
      if (image !== undefined) updates.image = image;
      if (company_description !== undefined)
        updates.company_description = company_description;
      if (start_date !== undefined) updates.start_date = start_date;
      if (end_date !== undefined) updates.end_date = end_date;
      const privateUpdates: Record<string, unknown> = {};
      if (positions !== undefined) privateUpdates.positions = positions;
      if (application_method !== undefined)
        privateUpdates.application_method = normalizedApplicationMethod;
      if (link !== undefined || normalizedApplicationMethod !== undefined) {
        updates.link = resolveRecruitmentLink(link, normalizedApplicationMethod ?? null);
      }
      if (contact !== undefined) privateUpdates.contact = contact;
      if (required_documents !== undefined)
        privateUpdates.required_documents = required_documents;
      if (event_id !== undefined) updates.event_id = event_id;

      if (Object.keys(updates).length === 0 && Object.keys(privateUpdates).length === 0) {
        return error("No fields to update");
      }

      let data: RecruitmentSummary | null = null;
      if (Object.keys(updates).length > 0) {
        const { data: publicData, error: dbError } = await supabase
          .from("competitions")
          .update(updates)
          .eq("id", id)
          .select("id, created_at, updated_at, title, link, image, company_description, start_date, end_date, event_id")
          .single();

        if (dbError) {
          return error(dbError.message);
        }

        data = publicData as RecruitmentSummary;
      } else {
        const { data: currentData, error: currentError } = await supabase
          .from("competitions")
          .select("id, created_at, updated_at, title, link, image, company_description, start_date, end_date, event_id")
          .eq("id", id)
          .single();

        if (currentError) {
          return error(currentError.message);
        }

        data = currentData as RecruitmentSummary;
      }

      let details: RecruitmentPrivateDetails | null = null;
      if (Object.keys(privateUpdates).length > 0) {
        const { data: privateData, error: privateError } = await supabase
          .from("competition_private_details")
          .upsert({
            competition_id: id,
            ...privateUpdates,
          })
          .select("competition_id, created_at, updated_at, positions, application_method, contact, required_documents")
          .single();

        if (privateError) {
          return error(privateError.message);
        }

        details = privateData as RecruitmentPrivateDetails;
      } else {
        const { data: privateData, error: privateError } = await supabase
          .from("competition_private_details")
          .select("competition_id, created_at, updated_at, positions, application_method, contact, required_documents")
          .eq("competition_id", id)
          .maybeSingle();

        if (privateError) {
          return error(privateError.message);
        }

        details = (privateData as RecruitmentPrivateDetails | null) ?? null;
      }

      return success(composeRecruitment(data, details));
    }
  );

  // --- list_recruitment_owners (admin only) ---
  // Mirrors RecruitmentOwnerPicker — owners gain edit + applicant-view rights
  // on the recruitment via the competition_owners pivot.
  server.tool(
    "list_recruitment_owners",
    {
      recruitment_id: z.string().uuid(),
    },
    async ({ recruitment_id }) => {
      const { data: ownerRows, error: ownersError } = await supabase
        .from("competition_owners")
        .select("user_id")
        .eq("competition_id", recruitment_id);

      if (ownersError) {
        return error(ownersError.message);
      }

      const userIds = (ownerRows ?? []).map((row) => row.user_id);
      if (userIds.length === 0) {
        return success([]);
      }

      const { data: allUsers, error: usersError } = await supabase.rpc("get_all_users");

      if (usersError) {
        return error(usersError.message);
      }

      const userById = new Map(
        ((allUsers as { id: string; email: string; display_name: string | null }[] | null) ?? []).map((u) => [u.id, u])
      );

      return success(
        userIds.map((uid) => ({
          user_id: uid,
          email: userById.get(uid)?.email ?? null,
          display_name: userById.get(uid)?.display_name ?? null,
        }))
      );
    }
  );

  // --- add_recruitment_owner (admin only) ---
  server.tool(
    "add_recruitment_owner",
    {
      recruitment_id: z.string().uuid(),
      user_id: z.string().uuid(),
    },
    async ({ recruitment_id, user_id }) => {
      const { data, error: dbError } = await supabase
        .from("competition_owners")
        .insert({ competition_id: recruitment_id, user_id })
        .select("competition_id, user_id")
        .single();

      if (dbError) {
        return error(dbError.message);
      }

      return success(data);
    }
  );

  // --- remove_recruitment_owner (admin only) ---
  server.tool(
    "remove_recruitment_owner",
    {
      recruitment_id: z.string().uuid(),
      user_id: z.string().uuid(),
    },
    async ({ recruitment_id, user_id }) => {
      const { error: dbError } = await supabase
        .from("competition_owners")
        .delete()
        .eq("competition_id", recruitment_id)
        .eq("user_id", user_id);

      if (dbError) {
        return error(dbError.message);
      }

      return success({ recruitment_id, user_id });
    }
  );
}
