interface KPICardProps {
  label: string;
  value: string;
  subtitle?: string;
  variant?: "default" | "highlight";
}

export function KPICard({
  label,
  value,
  subtitle,
  variant = "default",
}: KPICardProps) {
  const borderColor =
    variant === "highlight"
      ? "border-accent/20"
      : "border-border-primary";

  return (
    <div
      className={`border ${borderColor} bg-surface-primary p-5 dark:bg-surface-primary`}
    >
      <p className="text-[11px] font-medium uppercase tracking-wider text-text-quaternary">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-text-primary">
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 text-xs text-text-quaternary">
          {subtitle}
        </p>
      )}
    </div>
  );
}
