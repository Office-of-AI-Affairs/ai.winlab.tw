"use server";

import { updateTag } from "next/cache";

export async function revalidateCarousel() {
  updateTag("carousel-slides");
}
