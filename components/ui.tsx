import { cn } from "@/lib/cn";

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-6 max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
      <h1 className="mt-1 font-display text-2xl font-medium tracking-tight sm:text-3xl lg:text-4xl">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-muted sm:text-base">{description}</p>
    </header>
  );
}

export function SectionTitle({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="font-display text-lg font-medium sm:text-xl">{title}</h2>
      {detail ? <p className="text-sm text-muted">{detail}</p> : null}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("rounded-2xl border border-line bg-card p-4 sm:p-5", className)}>{children}</section>;
}

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-accent text-white hover:bg-[#7c2d12]",
        variant === "secondary" && "border border-line bg-white text-foreground hover:bg-stone-50",
        variant === "ghost" && "text-foreground hover:bg-stone-100",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "good" | "warn";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "neutral" && "bg-stone-100 text-stone-700",
        tone === "good" && "bg-emerald-50 text-emerald-800",
        tone === "warn" && "bg-amber-50 text-amber-900",
      )}
    >
      {children}
    </span>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-line bg-white px-3 text-base outline-none focus:border-accent sm:text-sm",
        className,
      )}
      {...rest}
    />
  );
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props;
  return (
    <select
      className={cn(
        "h-11 w-full rounded-xl border border-line bg-white px-3 text-base outline-none focus:border-accent sm:text-sm",
        className,
      )}
      {...rest}
    />
  );
}

export function statusTone(status: string): "good" | "warn" | "neutral" {
  if (status === "Active") return "good";
  if (status === "On Leave") return "warn";
  return "neutral";
}
