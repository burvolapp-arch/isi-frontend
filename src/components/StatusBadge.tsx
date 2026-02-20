import type { ScoreClassification } from "@/lib/types";

interface StatusBadgeProps {
  classification: ScoreClassification | null;
}

const BADGE_STYLES: Record<ScoreClassification, string> = {
  highly_concentrated:
    "text-band-highly bg-red-50",
  moderately_concentrated:
    "text-band-moderately bg-amber-50",
  mildly_concentrated:
    "text-band-mildly bg-yellow-50",
  unconcentrated:
    "text-band-unconcentrated bg-emerald-50",
};

const LABELS: Record<ScoreClassification, string> = {
  highly_concentrated: "Highly Concentrated",
  moderately_concentrated: "Moderately Concentrated",
  mildly_concentrated: "Mildly Concentrated",
  unconcentrated: "Unconcentrated",
};

export function StatusBadge({ classification }: StatusBadgeProps) {
  if (!classification) {
    return (
      <span className="inline-flex items-center rounded-sm bg-surface-tertiary px-3 py-1.5 text-[14px] font-semibold text-text-quaternary">
        N/A
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-sm px-3 py-1.5 text-[14px] font-semibold ${BADGE_STYLES[classification]}`}
    >
      {LABELS[classification]}
    </span>
  );
}
