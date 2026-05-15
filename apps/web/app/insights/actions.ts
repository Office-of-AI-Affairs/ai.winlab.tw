"use server";

import { updateTag } from "next/cache";

export async function revalidateInsights() {
  updateTag("insights-published");
}
