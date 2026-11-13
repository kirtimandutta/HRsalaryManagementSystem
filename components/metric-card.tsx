import type { LucideIcon } from "lucide-react";

export function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-line bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        <Icon className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
      </div>
      <p className="mt-3 break-words font-display text-xl font-medium tracking-tight tabular-nums sm:text-2xl xl:text-3xl">{value}</p>
      <p className="mt-2 text-sm leading-5 text-muted">{hint}</p>
    </article>
  );
}
