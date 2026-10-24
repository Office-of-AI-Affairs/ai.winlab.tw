import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";

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
  const result = await postFile(processed, { bucket: "announcement-images", prefix });
  if ("error" in result) return result;
  return { url: result.url! };
}

/** POST /api/files; the server names the file and checks who may upload where. */
async function postFile(
  file: Blob,
  fields: Record<string, string>,
): Promise<{ url?: string; path: string } | { error: string }> {
  const form = new FormData();
  form.append("file", file);
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  try {
    const res = await fetch("/api/files", { method: "POST", body: form, credentials: "same-origin" });
    const body = (await res.json().catch(() => ({}))) as { url?: string; path?: string; error?: string };
    if (!res.ok || !body.path) return { error: body.error ?? `Upload failed (${res.status})` };
    return { url: body.url, path: body.path };
  } catch (err) {
    console.error("Upload error:", err);
    return { error: "Upload failed" };
  }
}

export const uploadAnnouncementImage = (file: File) => uploadImage(file);
export const uploadCarouselImage = (file: File) => uploadImage(file, "carousel/");
export const uploadRecruitmentImage = (file: File) => uploadImage(file, "recruitment/");
export const uploadResultImage = (file: File) => uploadImage(file, "results/");
export const uploadEventImage = (file: File) => uploadImage(file, "events/");
export const uploadOrganizationImage = (file: File) => uploadImage(file, "organization/");
export const uploadExternalResultImage = (file: File) => uploadImage(file, "external-results/");

const PDF_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

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

  const result = await postFile(file, { bucket: "resumes" });
  if ("error" in result) return result;
  return { path: result.path };
}
