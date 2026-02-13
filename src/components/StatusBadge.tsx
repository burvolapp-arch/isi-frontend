import type { ScoreClassification } from "@/lib/types";

interface StatusBadgeProps {
  classification: ScoreClassification | null;
}

const BADGE_STYLES: Record<ScoreClassification, string> = {
  highly_concentrated:
    "border-band-highly/30 text-band-highly bg-band-highly/5",
  moderately_concentrated:
    "border-band-moderately/30 text-band-moderately bg-band-moderately/5",
  mildly_concentrated:
    "border-band-mildly/30 text-band-mildly bg-band-mildly/5",
  unconcentrated:
    "border-band-unconcentrated/30 text-band-unconcentrated bg-band-unconcentrated/5",
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
      <span className="inline-flex items-center border border-border-primary px-2 py-0.5 text-[11px] font-medium text-text-quaternary">
        N/A
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center border px-2 py-0.5 text-[11px] font-medium ${BADGE_STYLES[classification]}`}
    >
      {LABELS[classification]}
    </span>
  );
}
