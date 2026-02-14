"use client";

interface ErrorPanelProps {
  title: string;
  message: string;
  endpoint?: string;
  status?: number;
}

export function ErrorPanel({ title, message, endpoint, status }: ErrorPanelProps) {
  return (
    <div className="border-l-2 border-severity-high bg-severity-high/5 px-6 py-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-severity-high">
          <svg
            className="h-5 w-5"
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
        <div>
          <h3 className="text-[14px] font-semibold text-severity-high">
            {title}
          </h3>
          <p className="mt-1 text-[14px] text-text-secondary">
            {message}
          </p>
          {endpoint && (
            <p className="mt-2 font-mono text-[12px] text-text-quaternary">
              Endpoint: {endpoint}
              {status != null && ` — HTTP ${status}`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
