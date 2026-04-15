import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { ThemeProvider } from "@/providers/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? "https://go-now.dev"
  : "http://localhost:3000";

export const metadata: Metadata = {
  title: "Go Now - Beach & Run Conditions",
  description:
    "Hourly swim and run scores for the Tel Aviv coast. 4 activity modes scored 0-100 using wave, UV, AQI, wind, and rain data.",
  openGraph: {
    title: "Go Now - Beach & Run Conditions",
    description:
      "Hourly swim and run scores for the Tel Aviv coast. 4 activity modes scored 0-100 using wave, UV, AQI, wind, and rain data.",
    url: BASE_URL,
    siteName: "Go Now",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Go Now - Beach & Run Conditions",
    description:
      "Hourly swim and run scores for the Tel Aviv coast. 4 activity modes scored 0-100 using wave, UV, AQI, wind, and rain data.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0A0E1A" },
    { media: "(prefers-color-scheme: light)", color: "#f0f4f8" },
  ],
};

// Inline script injected in <head> before any paint to prevent flash-of-wrong-theme.
// Reads localStorage, falls back to system preference.
const noFlashScript = `(function(){try{var t=localStorage.getItem('theme')||'auto';var d=t==='dark'||(t==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the dark class is added by JS before hydration,
    // so server HTML and client HTML intentionally differ on <html>.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen text-gray-900 dark:text-white`}
      >
        <ThemeProvider>
          <NavBar />
          <main className="max-w-6xl mx-auto px-4 lg:px-8 py-4">
            {children}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
