"use server";

import { updateTag } from "next/cache";

export async function revalidateIntroduction() {
  updateTag("introduction");
}

export async function revalidateOrganizationMembers() {
  updateTag("organization-members");
}
