"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}

// ═══════════════════════════════════════════════════════════════════════
// Storage
// ═══════════════════════════════════════════════════════════════════════

const STORAGE_KEY = "isi-theme";

function readStored(): Theme {
  if (typeof window === "undefined") return "system";
  const val = localStorage.getItem(STORAGE_KEY);
  if (val === "light" || val === "dark" || val === "system") return val;
  return "system";
}

function writeStored(t: Theme) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, t);
}

function getSystemPreference(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolve(theme: Theme): "light" | "dark" {
  return theme === "system" ? getSystemPreference() : theme;
}

// ═══════════════════════════════════════════════════════════════════════
// Provider
// ═══════════════════════════════════════════════════════════════════════

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  // Hydrate from localStorage
  useEffect(() => {
    const stored = readStored();
    setThemeState(stored);
    setResolved(resolve(stored));
  }, []);

  // Apply class on <html>
  useEffect(() => {
    const r = resolve(theme);
    setResolved(r);
    const html = document.documentElement;
    html.classList.toggle("dark", r === "dark");
    html.style.colorScheme = r;
  }, [theme]);

  // Listen for system preference changes
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const r = resolve("system");
      setResolved(r);
      document.documentElement.classList.toggle("dark", r === "dark");
      document.documentElement.style.colorScheme = r;
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    writeStored(t);
    setThemeState(t);
  }, []);

  const toggle = useCallback(() => {
    setTheme(resolved === "dark" ? "light" : "dark");
  }, [resolved, setTheme]);

  return (
    <ThemeContext value={{ theme, resolved, setTheme, toggle }}>
      {children}
    </ThemeContext>
  );
}
