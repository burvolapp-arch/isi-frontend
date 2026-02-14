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
      className={`rounded-md border border-border-primary bg-surface-tertiary px-5 py-4 ${
        variant === "highlight" ? "border-l-2 border-l-accent" : ""
      }`}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
        {label}
      </p>
      <p className="mt-1 font-mono text-[24px] font-medium leading-none tracking-tight text-text-primary">
        {value}
      </p>
      {subtitle && (
        <p className="mt-1.5 text-[12px] text-text-tertiary">
          {subtitle}
        </p>
      )}
    </div>
  );
}
