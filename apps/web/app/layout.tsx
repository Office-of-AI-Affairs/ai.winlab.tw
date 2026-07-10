import "@/app/globals.css";
import { AppLink } from "@/components/app-link";
import { AuthProvider } from "@/components/auth-provider";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { LazyToaster } from "@/components/lazy-toaster";
import { getPinnedEvents } from "@/lib/supabase/get-pinned-events";
import { getClientAttributionAttributes } from "@/lib/otel/attribution";
import { SITE_NAME } from "@/lib/site";
import { trace } from "@opentelemetry/api";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Instrument_Serif, Noto_Sans, Noto_Sans_Mono } from "next/font/google";
import { headers } from "next/headers";
import { NuqsAdapter } from "nuqs/adapters/next/app";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
});

const notoSansMono = Noto_Sans_Mono({
  variable: "--font-noto-sans-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ai.winlab.tw"),
  title: SITE_NAME,
  description: "國立陽明交通大學人工智慧專責辦公室網站，提供辦公室介紹、組織成員、公告、活動、成果與徵才資訊。",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "zh_TW",
    title: SITE_NAME,
    description:
      "國立陽明交通大學人工智慧專責辦公室網站，提供辦公室介紹、組織成員、公告、活動、成果與徵才資訊。",
    url: "https://ai.winlab.tw",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og.png"],
  },
  verification: {
    google: "vjj3Fw7BmozLkeGrZTCo6PYVVqBhPQG6tTvbQel7fwM",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // No cookie reads here — layout stays cookieless so downstream pages
  // can SSG/ISR. Auth hydrates client-side inside <AuthProvider>.
  const pinnedEvents = await getPinnedEvents();

  // Client attribution for Sensorium: middleware/proxy.ts can't see the
  // exported request span on Vercel (it runs in the Edge sandbox, isolated
  // from the Node.js OTel context `instrumentation.ts` registers — see
  // lib/otel/attribution.ts's docstring for the fixed attribute-key
  // contract). Root layout runs as a Node.js Server Component, so
  // `trace.getActiveSpan()` here is the same span Sensorium receives.
  //
  // Caveat verified locally via `next build && next start`: this only
  // fires on requests that actually invoke the render function. For the
  // `ƒ` (Dynamic) routes under this layout that's every request; for the
  // `○`/`●` (Static/ISR) public pages (`/`, `/introduction`, `/announcement`,
  // `/events`, `/insights`, `/privacy`, `/design`, ...) Next.js keeps
  // serving the cached HTML (`x-nextjs-cache: HIT` regardless of
  // `x-forwarded-for`) without re-running this component, so those pages
  // don't get per-visitor attribution — only the rare ISR background
  // regeneration hits this line, tagging that one regen's span with
  // whichever request triggered it. `headers()` did not force this layout
  // to dynamic in a local build (Next 16.2.6), so ISR/SSG on those routes
  // is unaffected either way. Flagged for Sensorium data-quality awareness.
  // headers() throws DYNAMIC_SERVER_USAGE when called during ISR background
  // revalidation on Vercel — OTel instrumentation keeps getActiveSpan() non-null
  // even in that context, so the optional-chain doesn't short-circuit. Catch
  // silently: attribution is a best-effort signal, not required for correctness.
  try {
    trace.getActiveSpan()?.setAttributes(getClientAttributionAttributes(await headers()));
  } catch {
    // static/ISR pre-render context — attribution unavailable
  }

  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <head>
        {/* next/font's Google Fonts loader filters by subset, and "Noto Sans"
            has no CJK subset — so Chinese glyphs are served directly from
            Google Fonts to keep the unicode-range lazy-loading intact. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap"
        />
      </head>
      <body className={`${notoSans.variable} ${notoSansMono.variable} ${instrumentSerif.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <NuqsAdapter>
            <AuthProvider>
              <div className="relative flex flex-col min-h-dvh">
                <AppLink
                  href="#main-content"
                  interactive={false}
                  className="sr-only absolute left-4 top-4 z-[60] rounded-md bg-background px-3 py-2 text-sm font-medium text-foreground shadow-md focus:not-sr-only focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  跳至主要內容
                </AppLink>
                <Header pinnedEvents={pinnedEvents} />
                <main id="main-content" className="flex-1">
                  {children}
                </main>
                <Footer />
              </div>
              <LazyToaster />
            </AuthProvider>
          </NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  );
}
