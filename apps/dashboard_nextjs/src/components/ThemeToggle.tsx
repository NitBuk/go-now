"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/providers/ThemeProvider";

type Theme = "light" | "dark" | "auto";

const CYCLE: Theme[] = ["auto", "dark", "light"];

const LABELS: Record<Theme, string> = {
  auto: "System theme (auto)",
  dark: "Dark mode",
  light: "Light mode",
};

const ICONS: Record<Theme, typeof Monitor> = {
  auto: Monitor,
  dark: Moon,
  light: Sun,
};

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const handleClick = () => {
    const idx = CYCLE.indexOf(theme);
    setTheme(CYCLE[(idx + 1) % CYCLE.length]);
  };

  const Icon = ICONS[theme];

  return (
    <button
      onClick={handleClick}
      title={LABELS[theme]}
      aria-label={`Current theme: ${LABELS[theme]}. Click to change.`}
      className="flex items-center justify-center w-8 h-8 rounded-full text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
    >
      <Icon size={15} />
    </button>
  );
}
