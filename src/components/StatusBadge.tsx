import type { ScoreClassification } from "@/lib/types";

interface StatusBadgeProps {
  classification: ScoreClassification | null;
}

const BADGE_STYLES: Record<ScoreClassification, string> = {
  highly_concentrated:
    "text-band-highly",
  moderately_concentrated:
    "text-band-moderately",
  mildly_concentrated:
    "text-band-mildly",
  unconcentrated:
    "text-band-unconcentrated",
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
      <span className="inline-flex items-center rounded-sm bg-surface-tertiary px-2.5 py-1 text-[11px] font-medium text-text-quaternary">
        N/A
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-sm px-2.5 py-1 text-[11px] font-medium ${BADGE_STYLES[classification]}`}
    >
      {LABELS[classification]}
    </span>
  );
}
