import { ImageResponse } from "next/og";
import sharp from "sharp";
import { SITE_NAME_EN, SITE_NAME_ZH } from "@/lib/site";

/**
 * Shared per-page Open Graph image renderer (#49) — used by the
 * `opengraph-image.tsx` file-convention route in every content detail
 * segment (announcement, event, result). Keeps the visual design (brand
 * color, badge, title treatment) in one place instead of duplicating JSX
 * across four route files.
 */

// docs/design/visual-identity.md — NYCU Royal Blue, the site's single brand
// token (`--primary`). OG images render outside the app's CSS pipeline
// (Satori, not a browser), so the hex literal is intentional here — there is
// no Tailwind/OKLCH token to reach for inside `next/og`.
const NYCU_BLUE = "#0033A0";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

// The badge always renders both languages side by side ("公告 · Announcement")
// regardless of the viewer's locale — it's fixed bilingual branding, not
// translated content, so it lives here as a constant rather than in the
// per-locale i18n dictionary.
export const OG_BADGE = {
  announcement: { zh: "公告", en: "Announcement" },
  event: { zh: "活動", en: "Event" },
  result: { zh: "成果", en: "Result" },
} as const;

// Same reasoning as OG_BADGE — office branding is bilingual on every render,
// not locale-switched.
export const OG_OFFICE_NAME = { zh: SITE_NAME_ZH, en: SITE_NAME_EN } as const;

export type OgImageInput = {
  /** The page's own title (localizedField value already resolved by the caller). */
  title: string;
  /** Content-type badge, e.g. `OG_BADGE.announcement`. */
  badge: { zh: string; en: string };
  /** Bilingual office branding shown in the top-left corner. Defaults to
   *  `OG_OFFICE_NAME` — every caller today uses the default. */
  officeName?: { zh: string; en: string };
  /** The content's own cover/header image, when it has one. Rendered as a
   *  full-bleed cover-fit background with a title overlay bar, instead of
   *  the flat brand-color card. */
  coverImageUrl?: string | null;
};

// Formats Satori (the renderer behind `next/og`/`ImageResponse`) can embed
// directly. Everything else — most notably WebP, which is this app's
// default upload format (see `apps/web/CLAUDE.md` storage bucket notes) —
// crashes Satori's font/image pass entirely (`TypeError: Spread syntax
// requires ...iterable not be null or undefined`, reproduced against a real
// announcement's inline WebP image; see PR description). Transcode anything
// outside this set to JPEG with `sharp` before embedding.
const SATORI_SAFE_IMAGE_TYPES = new Set(["image/png", "image/jpeg"]);

async function fetchAsDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());

    if (SATORI_SAFE_IMAGE_TYPES.has(contentType)) {
      return `data:${contentType};base64,${buffer.toString("base64")}`;
    }

    // Cap the decode/re-encode size — cover images are already served at
    // upload-time resolution (recompress-images.ts caps at 1920px), this is
    // just a defensive ceiling against an unexpectedly huge source.
    const jpeg = await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Google Fonts' CSS2 endpoint subsets a family down to only the glyphs
 * present in `text` when a `text=` query param is passed — so instead of
 * bundling the full Noto Sans TC family (tens of MB across the CJK
 * repertoire, per weight) we fetch a per-render subset covering exactly the
 * characters this image needs (title + badge + office name), typically a
 * few KB. This is a server-side fetch made by the OG route handler itself
 * at request time, never by the viewer's browser.
 *
 * The endpoint serves `woff2` to modern browser user agents but `truetype`
 * to anything that doesn't advertise woff2 support — Satori (the renderer
 * behind `next/og`) needs `truetype`/`opentype`, not `woff2`, so the fetch
 * deliberately sends a plain desktop User-Agent to get the compatible
 * format. Verified against a live announcement title from the DB (see PR
 * description) rather than assumed from docs.
 */
async function fetchNotoSansTCSubset(text: string, weight: 400 | 700): Promise<ArrayBuffer | null> {
  const uniqueChars = Array.from(new Set(text.split(""))).join("");
  if (!uniqueChars.trim()) return null;
  const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@${weight}&text=${encodeURIComponent(uniqueChars)}`;
  try {
    const cssRes = await fetch(cssUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
    });
    if (!cssRes.ok) return null;
    const css = await cssRes.text();
    const match = css.match(/src: url\(([^)]+)\)/);
    if (!match) return null;
    const fontRes = await fetch(match[1]);
    if (!fontRes.ok) return null;
    return await fontRes.arrayBuffer();
  } catch {
    return null;
  }
}

export async function renderOgImage(input: OgImageInput): Promise<ImageResponse> {
  const officeName = input.officeName ?? OG_OFFICE_NAME;

  // Every glyph that can appear on the image, bundled into one subset
  // request per weight — badge/office-name English labels are included too
  // so the whole tree can share a single `fontFamily` without falling back
  // to a different (tofu-prone) font for the Latin-only nodes.
  const allText = [input.title, input.badge.zh, input.badge.en, officeName.zh, officeName.en].join(
    "",
  );

  const [bold, regular, coverDataUri] = await Promise.all([
    fetchNotoSansTCSubset(allText, 700),
    fetchNotoSansTCSubset(allText, 400),
    input.coverImageUrl ? fetchAsDataUri(input.coverImageUrl) : Promise.resolve(null),
  ]);

  const fonts: NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"] = [];
  if (bold) fonts.push({ name: "Noto Sans TC", data: bold, weight: 700, style: "normal" });
  if (regular) fonts.push({ name: "Noto Sans TC", data: regular, weight: 400, style: "normal" });
  // Falls back to Satori's bundled Geist (Latin-only) if the Google Fonts
  // fetch failed — degrades to tofu for CJK titles rather than a 500.
  const fontFamily = fonts.length > 0 ? "Noto Sans TC" : undefined;

  const hasCover = Boolean(coverDataUri);

  return new ImageResponse(
    (
      <div
        style={{
          width: OG_WIDTH,
          height: OG_HEIGHT,
          display: "flex",
          position: "relative",
          backgroundColor: NYCU_BLUE,
          fontFamily,
          color: "#ffffff",
        }}
      >
        {coverDataUri && (
          // eslint-disable-next-line @next/next/no-img-element -- Satori is not a browser; next/image doesn't apply here.
          <img
            src={coverDataUri}
            alt=""
            // Satori doesn't support the `inset` shorthand (silently
            // no-ops) — explicit top/left/right/bottom, not `inset: 0`. No
            // width/height attributes either: those set the img's own
            // intrinsic box and fight with `objectFit: cover` sizing it
            // from the absolutely-positioned edges instead (verified —
            // with them set, the cover photo rendered pillarboxed instead
            // of filling the frame).
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}
        {hasCover && (
          // Bottom-up scrim so the title bar clears contrast against an
          // arbitrary cover photo — same shape as the home carousel's
          // scrim (docs/design/visual-identity.md#imagery), sized to the
          // text block rather than the whole image.
          <div
            style={{
              position: "absolute",
              top: "45%",
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.72) 65%, rgba(0,0,0,0) 100%)",
            }}
          />
        )}
        {hasCover && (
          // Matching top-down scrim for the office branding corner — an
          // arbitrary cover photo can be bright at the top too (verified
          // against a real announcement cover with a white top band,
          // where the branding text was unreadable without this).
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "30%",
              display: "flex",
              background: "linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.65) 55%, rgba(0,0,0,0) 100%)",
            }}
          />
        )}

        <div style={{ position: "absolute", top: 48, left: 64, display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 24, fontWeight: 700 }}>{officeName.zh}</span>
          <span style={{ fontSize: 17, fontWeight: 400, opacity: 0.85, marginTop: 4 }}>
            {officeName.en}
          </span>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 56,
            left: 64,
            right: 64,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <span
            style={{
              display: "flex",
              alignSelf: "flex-start",
              fontSize: 20,
              fontWeight: 700,
              padding: "8px 20px",
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.16)",
              border: "1px solid rgba(255,255,255,0.55)",
            }}
          >
            {input.badge.zh} · {input.badge.en}
          </span>
          <span
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
              overflow: "hidden",
              fontSize: 54,
              fontWeight: 700,
              lineHeight: 1.3,
            }}
          >
            {input.title}
          </span>
        </div>
      </div>
    ),
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      fonts,
    },
  );
}
