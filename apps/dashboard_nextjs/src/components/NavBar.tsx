"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

const NAV_LINKS = [
  { href: "/", label: "Forecast" },
  { href: "/status", label: "Status" },
  { href: "/formula", label: "Formula" },
  { href: "/about", label: "About" },
] as const;

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-0 z-50 backdrop-blur-xl border-b"
      style={{ background: "var(--nav-bg)", borderColor: "var(--nav-border)" }}
    >
      <div className="max-w-6xl mx-auto px-4 lg:px-8 h-12 flex items-center justify-between">
        <Link href="/" className="flex items-center text-gray-900 dark:text-white">
          <Logo width={140} height={42} />
        </Link>
        <div className="flex items-center gap-1">
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
                    className="absolute inset-0 bg-black/[0.06] dark:bg-white/[0.1] rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span
                  className={`relative z-10 ${
                    isActive
                      ? "text-gray-900 dark:text-white"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  {link.label}
                </span>
              </Link>
            );
          })}
          <div className="ml-1">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
