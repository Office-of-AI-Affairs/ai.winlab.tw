import "@/app/globals.css";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Separator } from "@/components/ui/separator";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Noto_Sans, Noto_Sans_Mono } from "next/font/google";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
});

const notoSansMono = Noto_Sans_Mono({
  variable: "--font-noto-sans-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "國立陽明交通大學人工智慧專責辦公室",
  description: "國立陽明交通大學人工智慧專責辦公室",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body className={`${notoSans.variable} ${notoSansMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <div className="relative min-h-dvh">
            <div className="relative flex flex-col min-h-dvh">
              <div className="fixed top-0 left-0 right-0 z-50 bg-background/75 backdrop-blur-md shadow-lg">
                <Header />
                <Separator />
              </div>
              <div className="flex-1 pt-16">
                {children}
              </div>
              <Footer />
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
