import { createClient } from "@/lib/supabase/client";

const BUCKET = "announcement-images";

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

function isImageFile(file: File): boolean {
  return IMAGE_MIME_TYPES.includes(file.type);
}

function isWithinSizeLimit(file: File): boolean {
  return file.size <= MAX_SIZE_BYTES;
}

export async function uploadImage(
  file: File,
  prefix: string = "",
): Promise<{ url: string } | { error: string }> {
  if (!isImageFile(file)) {
    return { error: "不支援的圖片格式，請使用 JPEG、PNG、GIF 或 WebP" };
  }
  if (!isWithinSizeLimit(file)) {
    return { error: "圖片大小不可超過 5MB" };
  }

  const supabase = createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    console.error("Upload error:", error);
    return { error: error.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return { url: publicUrl };
}

export const uploadAnnouncementImage = (file: File) => uploadImage(file);
export const uploadCarouselImage = (file: File) => uploadImage(file, "carousel/");
export const uploadRecruitmentImage = (file: File) => uploadImage(file, "recruitment/");
export const uploadResultImage = (file: File) => uploadImage(file, "results/");
export const uploadEventImage = (file: File) => uploadImage(file, "events/");
export const uploadOrganizationImage = (file: File) => uploadImage(file, "organization/");
export const uploadExternalResultImage = (file: File) => uploadImage(file, "external-results/");

const PDF_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const RESUME_BUCKET = "resumes";

export async function uploadResumePdf(
  file: File,
  userId: string,
): Promise<{ path: string } | { error: string }> {
  if (file.type !== "application/pdf") {
    return { error: "僅支援 PDF 格式" };
  }
  if (file.size > PDF_MAX_SIZE_BYTES) {
    return { error: "檔案大小不可超過 10MB" };
  }
  if (!userId) {
    return { error: "尚未登入，無法上傳履歷" };
  }

  const supabase = createClient();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;

  const { error } = await supabase.storage.from(RESUME_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: "application/pdf",
  });

  if (error) {
    console.error("Resume upload error:", error);
    return { error: error.message };
  }

  return { path };
}
