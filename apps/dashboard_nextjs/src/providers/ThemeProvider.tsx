"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark" | "auto";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "auto",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize directly from localStorage — avoids a cascading setState in effect
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "auto";
    try {
      const saved = localStorage.getItem("theme") as Theme | null;
      if (saved === "light" || saved === "dark" || saved === "auto") return saved;
    } catch {
      // localStorage unavailable (private browsing, etc.)
    }
    return "auto";
  });

  // Apply theme class to <html> and persist
  useEffect(() => {
    const root = document.documentElement;

    if (theme === "dark") {
      root.classList.add("dark");
      try { localStorage.setItem("theme", "dark"); } catch { /* ignore */ }
      return;
    }

    if (theme === "light") {
      root.classList.remove("dark");
      try { localStorage.setItem("theme", "light"); } catch { /* ignore */ }
      return;
    }

    // auto: follow system preference
    try { localStorage.setItem("theme", "auto"); } catch { /* ignore */ }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    root.classList.toggle("dark", mq.matches);
    const handler = (e: MediaQueryListEvent) => {
      root.classList.toggle("dark", e.matches);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  );
}
