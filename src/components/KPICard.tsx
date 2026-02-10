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
      ? "border-blue-200 dark:border-blue-800"
      : "border-zinc-200 dark:border-zinc-800";

  return (
    <div
      className={`rounded-lg border ${borderColor} bg-white p-5 dark:bg-zinc-950`}
    >
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          {subtitle}
        </p>
      )}
    </div>
  );
}
