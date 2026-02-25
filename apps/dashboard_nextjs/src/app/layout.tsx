import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
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
  ? "https://dashboard-841486153499.europe-west1.run.app"
  : "http://localhost:3000";

export const metadata: Metadata = {
  title: "Go Now — Tel Aviv Coast",
  description:
    "Hourly swim and run scores for the Tel Aviv coast. 4 activity modes scored 0–100 using wave, UV, AQI, wind, and rain data.",
  openGraph: {
    title: "Go Now — Tel Aviv Coast Buddy",
    description:
      "Hourly swim and run scores for the Tel Aviv coast. 4 activity modes scored 0–100 using wave, UV, AQI, wind, and rain data.",
    url: BASE_URL,
    siteName: "Go Now",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Go Now — Tel Aviv Coast Buddy",
    description:
      "Hourly swim and run scores for the Tel Aviv coast. 4 activity modes scored 0–100 using wave, UV, AQI, wind, and rain data.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0A0E1A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen text-white`}
      >
        <NavBar />
        <main className="max-w-lg mx-auto px-4 py-4">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
