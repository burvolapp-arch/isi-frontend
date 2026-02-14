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
  return (
    <div
      className={`bg-surface-tertiary/60 px-6 py-5 ${
        variant === "highlight" ? "border-l-2 border-accent" : ""
      }`}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
        {label}
      </p>
      <p className="mt-1.5 font-mono text-[28px] font-medium leading-none tracking-tight text-text-primary">
        {value}
      </p>
      {subtitle && (
        <p className="mt-2 text-[13px] text-text-tertiary">
          {subtitle}
        </p>
      )}
    </div>
  );
}
