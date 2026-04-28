import "@/app/globals.css";
import { AppLink } from "@/components/app-link";
import { AuthProvider } from "@/components/auth-provider";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Toaster } from "@/components/ui/sonner";
import { getPinnedEvents } from "@/lib/supabase/get-pinned-events";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Instrument_Serif, Noto_Sans, Noto_Sans_Mono } from "next/font/google";
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
  title: "國立陽明交通大學 人工智慧專責辦公室",
  description: "國立陽明交通大學人工智慧專責辦公室網站，提供辦公室介紹、組織成員、公告、活動、成果與徵才資訊。",
  openGraph: {
    type: "website",
    siteName: "國立陽明交通大學 人工智慧專責辦公室",
    locale: "zh_TW",
    title: "國立陽明交通大學 人工智慧專責辦公室",
    description:
      "國立陽明交通大學人工智慧專責辦公室網站，提供辦公室介紹、組織成員、公告、活動、成果與徵才資訊。",
    url: "https://ai.winlab.tw",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "國立陽明交通大學 人工智慧專責辦公室",
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
              <Toaster />
            </AuthProvider>
          </NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  );
}
