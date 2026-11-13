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
  metadataBase: new URL("https://polymate-frontend.vercel.app"),

  title: {
    default: "PolyMate - Telangana Polytechnic Study Materials",
    template: "%s | PolyMate",
  },

  description:
    "PolyMate is a digital learning platform for Telangana diploma and polytechnic students. Access subject notes, previous question papers and academic resources across engineering branches.",

  applicationName: "PolyMate",

  keywords: [
    "PolyMate",
    "Telangana Polytechnic",
    "Diploma Study Materials",
    "Diploma Notes",
    "Polytechnic Question Papers",
    "SBTET Telangana",
    "Engineering Diploma",
    "CSE Diploma Notes",
    "Polytechnic Students",
  ],

  alternates: {
    canonical: "https://polymate-frontend.vercel.app/",
  },

  openGraph: {
    title: "PolyMate - Telangana Polytechnic Study Materials",
    description:
      "Access diploma notes, previous question papers and academic resources for Telangana polytechnic students.",
    url: "https://polymate-frontend.vercel.app/",
    siteName: "PolyMate",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/icons/polymate-192.png",
        width: 192,
        height: 192,
        alt: "PolyMate",
      },
    ],
  },

  twitter: {
    card: "summary",
    title: "PolyMate - Telangana Polytechnic Study Materials",
    description:
      "Diploma notes, previous question papers and academic resources.",
    images: ["/icons/polymate-192.png"],
  },

  manifest: "/manifest.webmanifest",

  appleWebApp: {
    capable: true,
    title: "PolyMate",
    statusBarStyle: "default",
  },

  icons: {
    apple: "/icons/polymate-192.png",
  },
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

