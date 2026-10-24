import { unstable_cache } from "next/cache";
import { asc, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { introduction, organization_members } from "@/lib/db/schema";
import type { Introduction, OrganizationMember } from "@winlab/db";

export const getIntroduction = unstable_cache(
  async (): Promise<Introduction | null> => {
    const [row] = await db.select().from(introduction).orderBy(asc(introduction.created_at)).limit(1);
    return row ?? null;
  },
  ["introduction"],
  { tags: ["introduction"], revalidate: 3600 },
);

export const getOrganizationMembers = unstable_cache(
  async (): Promise<OrganizationMember[]> =>
    db
      .select()
      .from(organization_members)
      .orderBy(
        asc(organization_members.group_order),
        asc(organization_members.sort_order),
        desc(organization_members.created_at),
      ),
  ["organization-members"],
  { tags: ["organization-members"], revalidate: 3600 },
);
