/**
 * OG card dimensions, split out of `og-image.ts` (#79).
 *
 * `og-image.ts` imports `next/og` and `sharp` at module scope, so any route
 * that touches it drags Satori's wasm and sharp's native binary into its own
 * serverless function. `generateMetadata` only needs the two numbers — on
 * Vercel the traced function was missing those assets and every route that
 * imported the renderer 500-ed (`/events/[slug]/results`, `/announcements`).
 * Metadata-only callers import from here; only the `opengraph-image.tsx`
 * routes, which genuinely render, import `og-image.ts`.
 */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
