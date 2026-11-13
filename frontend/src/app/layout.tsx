import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PWAProvider } from "@/components/pwa/PWAProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1746a2",
};
export const metadata: Metadata = {
  title: "PolyMate | Diploma Learning Portal",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "PolyMate",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/icons/polymate-192.png",
  },
  description: "PolyMate - Diploma study materials, notes and previous question papers.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-dvh min-w-0 flex flex-col">
        <ThemeProvider>

          <PWAProvider>{children}</PWAProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
