"use client";

import { useState, useEffect, useCallback, createContext, useContext, useId } from "react";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

interface ToastItem {
  id: string;
  message: string;
  variant: "success" | "info" | "error";
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastItem["variant"]) => void;
}

// ═══════════════════════════════════════════════════════════════════════
// Context
// ═══════════════════════════════════════════════════════════════════════

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

// ═══════════════════════════════════════════════════════════════════════
// Provider
// ═══════════════════════════════════════════════════════════════════════

const DISMISS_MS = 2400;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const baseId = useId();

  const toast = useCallback(
    (message: string, variant: ToastItem["variant"] = "success") => {
      const id = `${baseId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setItems((prev) => [...prev, { id, message, variant }]);
    },
    [baseId],
  );

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext value={{ toast }}>
      {children}
      {/* Toast container — fixed bottom-center, above mobile nav */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed bottom-20 left-1/2 z-[200] flex -translate-x-1/2 flex-col items-center gap-2 sm:bottom-8"
      >
        {items.map((item) => (
          <ToastBubble key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Bubble
// ═══════════════════════════════════════════════════════════════════════

function ToastBubble({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation on next frame
    const raf = requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      // Wait for exit animation before removing
      setTimeout(() => onDismiss(item.id), 200);
    }, DISMISS_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [item.id, onDismiss]);

  const icon =
    item.variant === "success"
      ? "✓"
      : item.variant === "error"
        ? "✕"
        : "ℹ";

  const variantClasses =
    item.variant === "success"
      ? "bg-toast-success-bg text-toast-success-fg"
      : item.variant === "error"
        ? "bg-toast-error-bg text-toast-error-fg"
        : "bg-toast-info-bg text-toast-info-fg";

  return (
    <div
      role="status"
      className={`
        pointer-events-auto flex items-center gap-2 rounded-lg px-4 py-2.5
        text-[13px] font-medium shadow-lg
        transition-all duration-200 ease-out
        ${variantClasses}
        ${visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}
      `}
    >
      <span aria-hidden="true" className="text-[14px]">{icon}</span>
      {item.message}
    </div>
  );
}
