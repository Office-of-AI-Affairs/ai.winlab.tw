"use server"

import { updateTag } from "next/cache"

export async function revalidatePrivacy() {
  updateTag("privacy")
}
