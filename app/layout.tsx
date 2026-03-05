import "@/app/globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Toaster } from "@/components/ui/sonner";
import { SquircleNoScript } from "@squircle-js/react";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Noto_Sans, Noto_Sans_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
});

const notoSansMono = Noto_Sans_Mono({
  variable: "--font-noto-sans-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "國立陽明交通大學 人工智慧專責辦公室",
  description: "Office of AI Affairs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body className={`${notoSans.variable} ${notoSansMono.variable} antialiased`}>
        <SquircleNoScript />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <NuqsAdapter>
            <AuthProvider>
              <div className="relative flex flex-col min-h-dvh">
                <div className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-md border-b border-background/10">
                  <Header />
                </div>
                <div className="flex-1 pt-16">
                  {children}
                </div>
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
