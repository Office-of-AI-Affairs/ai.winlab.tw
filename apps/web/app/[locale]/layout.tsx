import "@/app/globals.css";
import { AnalyticsBeacon } from "@/components/layout/analytics-beacon";
import { AppLink } from "@/components/shared/app-link";
import { AuthProvider } from "@/components/layout/auth-provider";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { LazyToaster } from "@/components/layout/lazy-toaster";
import { SearchProvider } from "@/components/layout/search-provider";
import { getPinnedEvents } from "@/lib/data/pinned-events";
import { SITE_DESCRIPTION_EN, SITE_DESCRIPTION_ZH, SITE_NAME, siteTitle } from "@/lib/site";
import { defaultLocale, isLocale, localePrefix, locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { LocaleProvider } from "@/lib/i18n/locale-provider";
import { ogAlternateLocales, ogLocale } from "@/lib/i18n/seo";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Instrument_Serif, Noto_Sans, Noto_Sans_Mono, Noto_Sans_TC } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
});

// Chinese glyphs. Google splits CJK fonts into ~100 unicode-range slices
// with no subset names, so preload is off; the browser fetches only the
// slices a page uses. Self-hosted: no render-blocking Google stylesheet.
const notoSansTC = Noto_Sans_TC({
  variable: "--font-noto-sans-tc",
  weight: ["400", "500", "700"],
  preload: false,
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const description = locale === "en" ? SITE_DESCRIPTION_EN : SITE_DESCRIPTION_ZH;
  const title = siteTitle(locale);

  return {
    metadataBase: new URL("https://ai.winlab.tw"),
    title,
    description,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: ogLocale(locale),
      alternateLocale: ogAlternateLocales(locale),
      title,
      description,
      url: "https://ai.winlab.tw",
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: title,
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
}

// Every page reads Postgres, which lives on the server machine and is not
// reachable from the CI build. So pages render per request; their data
// still comes from unstable_cache (tag-revalidated), which keeps the
// database load at one query per tag per hour.
export const dynamic = "force-dynamic";

// This `[locale]` segment IS the root layout — the segment above it is a
// root parameter (see next.config + proxy.ts for how the default locale is
// served un-prefixed).
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const dict = await getDictionary(locale);

  // No cookie reads here — the HTML is the same for every visitor. Auth
  // hydrates client-side inside <AuthProvider>.
  const pinnedEvents = await getPinnedEvents();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Announcements feed (#46) — canonical per-locale URL; feed
            readers/crawlers that only check the site root still find
            /rss.xml (app/rss.xml/route.ts, always zh-TW). */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title={locale === "en" ? "Announcements — NYCU Office of AI Affairs" : "人工智慧專責辦公室 公告"}
          href={`${localePrefix(locale)}/announcement/rss.xml`}
        />
      </head>
      <body className={`${notoSans.variable} ${notoSansTC.variable} ${notoSansMono.variable} ${instrumentSerif.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <LocaleProvider locale={locale} dict={dict}>
            <NuqsAdapter>
              <AuthProvider>
                <SearchProvider>
                  <div className="relative flex flex-col min-h-dvh">
                    <AppLink
                      href="#main-content"
                      interactive={false}
                      className="sr-only absolute left-4 top-4 z-[60] rounded-md bg-background px-3 py-2 text-sm font-medium text-foreground shadow-md focus:not-sr-only focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {dict.common.skipToContent}
                    </AppLink>
                    <Header pinnedEvents={pinnedEvents} />
                    <main id="main-content" className="flex-1">
                      {children}
                    </main>
                    <Footer t={dict.footer} locale={locale} />
                  </div>
                  <LazyToaster />
                  <AnalyticsBeacon />
                </SearchProvider>
              </AuthProvider>
            </NuqsAdapter>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
