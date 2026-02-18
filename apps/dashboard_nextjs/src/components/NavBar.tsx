"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const NAV_LINKS = [
  { href: "/", label: "Forecast" },
  { href: "/status", label: "Status" },
  { href: "/formula", label: "Formula" },
] as const;

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 bg-[#0A0E1A]/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image src="/logo.svg" alt="Go Now" width={140} height={42} priority />
        </Link>
        <div className="flex gap-1">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-3 py-1.5 text-xs font-medium transition-colors"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 bg-white/[0.1] rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span
                  className={`relative z-10 ${
                    isActive ? "text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {link.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
