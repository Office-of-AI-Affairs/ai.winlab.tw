import { createClient } from "@/lib/supabase/client";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";

const BUCKET = "announcement-images";

// 這個模組不是 React component，拿不到 useT / getDictionary（後者是 server-only）。
// 上傳一律在瀏覽器觸發，locale 就是 URL 第一段（預設 zh-TW 無前綴），據此 lazy-load
// 對應語系的錯誤訊息，避免把兩份 messages 都打進靜態 bundle。
function currentLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale;
  const seg = window.location.pathname.split("/")[1];
  return isLocale(seg) ? seg : defaultLocale;
}

async function loadErrors(): Promise<Dictionary["errors"]> {
  const messages =
    currentLocale() === "en"
      ? await import("@/lib/i18n/messages/en.json")
      : await import("@/lib/i18n/messages/zh-TW.json");
  return (messages.default as Dictionary).errors;
}

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
    // Lazy-load browser-image-compression (~50 KB / 19 KB gz). Only the
    // admin upload path actually compresses, so we don't want this in the
    // critical visitor bundle of any page that statically imports
    // useImageUpload / upload-image (introduction, results, recruitment…).
    const { default: imageCompression } = await import("browser-image-compression");
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
  const errors = await loadErrors();
  if (!isImageFile(file)) {
    return { error: errors.imageFormatUnsupported };
  }
  if (!isWithinSizeLimit(file)) {
    return { error: errors.imageTooLarge };
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
  const errors = await loadErrors();
  if (file.type !== "application/pdf") {
    return { error: errors.pdfOnly };
  }
  if (file.size > PDF_MAX_SIZE_BYTES) {
    return { error: errors.fileTooLarge };
  }
  if (!userId) {
    return { error: errors.resumeLoginRequired };
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
