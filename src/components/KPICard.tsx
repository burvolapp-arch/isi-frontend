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
      className={`group rounded-md border border-border-primary bg-surface-tertiary px-4 py-3 transition-[border-color,box-shadow] duration-150 hover:border-stone-300 hover:shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:px-5 sm:py-4 ${
        variant === "highlight" ? "border-l-2 border-l-accent" : ""
      }`}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
        {label}
      </p>
      <p className="mt-1 font-mono text-[20px] font-medium leading-none tracking-tight text-text-primary sm:text-[24px]">
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
