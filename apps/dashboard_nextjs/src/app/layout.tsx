import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Go Now — Tel Aviv Coast",
  description: "Hourly swim and run scores for the Tel Aviv coast",
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
        <nav className="sticky top-0 z-50 bg-[#0A0E1A]/80 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
            <Link href="/" className="text-sm font-bold text-white tracking-tight">
              Go Now
            </Link>
            <div className="flex gap-4">
              <Link
                href="/"
                className="text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Forecast
              </Link>
              <Link
                href="/status"
                className="text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Status
              </Link>
              <Link
                href="/formula"
                className="text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Formula
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-lg mx-auto px-4 py-4">{children}</main>
      </body>
    </html>
  );
}
