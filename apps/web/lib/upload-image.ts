import { createClient } from "@/lib/supabase/client";
import imageCompression from "browser-image-compression";

const BUCKET = "announcement-images";

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB input
const GIF_MIME = "image/gif";

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: "image/webp" as const,
  initialQuality: 0.8,
};

function isImageFile(file: File): boolean {
  return IMAGE_MIME_TYPES.includes(file.type);
}

function isWithinSizeLimit(file: File): boolean {
  return file.size <= MAX_SIZE_BYTES;
}

async function compressIfNeeded(file: File): Promise<File> {
  // GIF 動畫壓縮會丟幀，跳過
  if (file.type === GIF_MIME) return file;
  try {
    const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
    return compressed.size < file.size ? compressed : file;
  } catch (err) {
    console.warn("Image compression failed, using original:", err);
    return file;
  }
}

export async function uploadImage(
  file: File,
  prefix: string = "",
): Promise<{ url: string } | { error: string }> {
  if (!isImageFile(file)) {
    return { error: "不支援的圖片格式，請使用 JPEG、PNG、GIF 或 WebP" };
  }
  if (!isWithinSizeLimit(file)) {
    return { error: "圖片大小不可超過 10MB" };
  }

  const processed = await compressIfNeeded(file);
  const supabase = createClient();
  const ext =
    processed.type === "image/webp"
      ? "webp"
      : file.name.split(".").pop() || "jpg";
  const path = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, processed, {
    cacheControl: "31536000",
    upsert: false,
    contentType: processed.type,
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
