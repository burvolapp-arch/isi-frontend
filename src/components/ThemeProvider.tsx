"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
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
// Storage + Resolution (shared module-level logic)
// ═══════════════════════════════════════════════════════════════════════

const STORAGE_KEY = "isi-theme";

function readStored(): Theme {
  if (typeof window === "undefined") return "light";
  const val = localStorage.getItem(STORAGE_KEY);
  if (val === "light" || val === "dark" || val === "system") return val;
  return "light";
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

/** Apply .dark class + colorScheme to <html>. No React state involved — pure DOM. */
function applyToDOM(resolved: "light" | "dark") {
  const html = document.documentElement;
  html.classList.toggle("dark", resolved === "dark");
  html.style.colorScheme = resolved;
}


// ═══════════════════════════════════════════════════════════════════════
// External Store — single source of truth for theme, powers
// useSyncExternalStore for tear-free, SSR-safe reads.
// ═══════════════════════════════════════════════════════════════════════

let _listeners = new Set<() => void>();
let _theme: Theme = "light";
let _resolved: "light" | "dark" = "light";

// ── Stable snapshot references ──────────────────────────────────────
// useSyncExternalStore compares snapshots with Object.is().
// Returning a new object every call → infinite re-render loop.
// We cache the snapshot and only create a new object when values change.
let _snapshot: { theme: Theme; resolved: "light" | "dark" } = {
  theme: _theme,
  resolved: _resolved,
};

const _serverSnapshot: { theme: Theme; resolved: "light" | "dark" } = {
  theme: "light",
  resolved: "light",
};

function getSnapshot(): { theme: Theme; resolved: "light" | "dark" } {
  return _snapshot;
}

function getServerSnapshot(): { theme: Theme; resolved: "light" | "dark" } {
  // Server always returns system/light — the inline <script> will correct before paint
  return _serverSnapshot;
}

function subscribe(listener: () => void): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

function notify() {
  // Update cached snapshot reference (new object only when values actually changed)
  if (_snapshot.theme !== _theme || _snapshot.resolved !== _resolved) {
    _snapshot = { theme: _theme, resolved: _resolved };
  }
  for (const l of _listeners) l();
}

function setStoreTheme(t: Theme, _transition = true) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, t);
  _theme = t;
  _resolved = resolve(t);
  applyToDOM(_resolved);
  notify();
}

// ═══════════════════════════════════════════════════════════════════════
// Provider
// ═══════════════════════════════════════════════════════════════════════

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Hydrate store from what the inline <script> already set on <html>
  useEffect(() => {
    _theme = readStored();
    _resolved = resolve(_theme);
    // DOM is already correct from inline script — just sync the store
    notify();
  }, []);

  // Listen for system preference changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (_theme !== "system") return;
      _resolved = resolve("system");
      applyToDOM(_resolved);
      notify();
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Cross-tab sync via storage event
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const val = e.newValue;
      if (val === "light" || val === "dark" || val === "system") {
        _theme = val;
        _resolved = resolve(val);
        applyToDOM(_resolved);
        notify();
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const { theme, resolved } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setTheme = useCallback((t: Theme) => setStoreTheme(t, true), []);

  const toggle = useCallback(() => {
    setStoreTheme(resolved === "dark" ? "light" : "dark", true);
  }, [resolved]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolved, setTheme, toggle }),
    [theme, resolved, setTheme, toggle],
  );

  return (
    <ThemeContext value={value}>
      {children}
    </ThemeContext>
  );
}
