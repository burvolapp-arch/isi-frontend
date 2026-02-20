"use client";

import { memo } from "react";

interface ErrorPanelProps {
  title: string;
  message: string;
  endpoint?: string;
  status?: number;
}

export const ErrorPanel = memo(function ErrorPanel({ title, message, endpoint, status }: ErrorPanelProps) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-text-tertiary">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-text-primary">
            {title}
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
            {message}
          </p>
          {endpoint && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded bg-stone-100 px-2 py-0.5 font-mono text-[11px] text-text-quaternary">
              {endpoint}
              {status != null && <span className="text-text-quaternary/60">· HTTP {status}</span>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

ErrorPanel.displayName = "ErrorPanel";
