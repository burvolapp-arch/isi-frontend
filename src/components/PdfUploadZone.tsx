"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface PdfUploadZoneProps {
  paperId: string;
  paperTitle: string;
  existingPath: string;
  onUploadComplete: () => void;
}

export function PdfUploadZone({
  paperId,
  paperTitle,
  existingPath,
  onUploadComplete,
}: PdfUploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Cleanup timeout on unmount
  useEffect(() => () => clearTimeout(successTimerRef.current), []);

  const upload = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        setError("Only PDF files are accepted.");
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setError("File exceeds 50 MB limit.");
        return;
      }

      setError(null);
      setUploading(true);
      setSuccess(false);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("paperId", paperId);

        const res = await fetch("/api/research/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Upload failed" }));
          throw new Error(body.error || `HTTP ${res.status}`);
        }

        setSuccess(true);
        clearTimeout(successTimerRef.current);
        successTimerRef.current = setTimeout(() => setSuccess(false), 3000);
        onUploadComplete();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [paperId, onUploadComplete],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) upload(file);
    },
    [upload],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) upload(file);
      if (inputRef.current) inputRef.current.value = "";
    },
    [upload],
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`relative rounded-md border-2 border-dashed transition-colors ${
        dragOver
          ? "border-navy-500 bg-navy-700/5"
          : "border-border-primary bg-surface-tertiary hover:border-border-secondary"
      } ${uploading ? "pointer-events-none opacity-60" : ""}`}
    >
      <label className="flex cursor-pointer flex-col items-center gap-3 px-6 py-8">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileSelect}
          className="sr-only"
          aria-label={`Upload PDF for ${paperTitle}`}
        />

        {uploading ? (
          <>
            <svg className="h-8 w-8 animate-spin text-text-quaternary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-[13px] text-text-tertiary">Uploading…</span>
          </>
        ) : (
          <>
            <svg className="h-8 w-8 text-text-quaternary" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            <div className="text-center">
              <p className="text-[13px] font-medium text-text-secondary">
                Drop PDF here or <span className="text-navy-700 underline">browse</span>
              </p>
              <p className="mt-1 text-[11px] text-text-quaternary">
                Replaces {existingPath} · Max 50 MB
              </p>
            </div>
          </>
        )}
      </label>

      {error && (
        <p className="px-4 pb-3 text-center text-[12px] text-red-600" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="px-4 pb-3 text-center text-[12px] text-emerald-600" role="status">
          PDF uploaded successfully.
        </p>
      )}
    </div>
  );
}
