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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#F6F8FA] min-h-screen`}
      >
        <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-[#D0D7DE]">
          <div className="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
            <Link href="/" className="text-sm font-bold text-[#1F2328]">
              Go Now
            </Link>
            <div className="flex gap-4">
              <Link
                href="/"
                className="text-xs font-medium text-[#656D76] hover:text-[#1F2328] transition-colors"
              >
                Forecast
              </Link>
              <Link
                href="/status"
                className="text-xs font-medium text-[#656D76] hover:text-[#1F2328] transition-colors"
              >
                Status
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-lg mx-auto px-4 py-4">{children}</main>
      </body>
    </html>
  );
}
