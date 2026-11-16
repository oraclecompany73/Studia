import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, X, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { translate } from "@/lib/i18n";

export const field =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
export const btn =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-elegant disabled:opacity-60";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-60";
export const btnDanger =
  "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} aria-hidden />;
}

/** Card with a titled header row and an optional actions slot. */
export function SectionCard({
  title,
  hint,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  hint?: string | undefined;
  actions?: ReactNode | undefined;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-2xl bg-card shadow-card", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="font-bold">{translate(title)}</h2>}
            {hint && <p className="mt-0.5 text-xs text-muted-foreground">{translate(hint)}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

const statTones = {
  default: "bg-secondary text-primary",
  blue: "bg-tint-blue text-primary",
  green: "bg-tint-green text-success",
  amber: "bg-tint-amber text-foreground",
  rose: "bg-tint-rose text-destructive",
} as const;

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  hint,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: keyof typeof statTones;
  hint?: string;
}) {
  return (
    <div className="card-lift rounded-2xl bg-card p-4 shadow-card">
      <div className="flex items-center gap-2">
        <span
          className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", statTones[tone])}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 text-xs font-semibold text-muted-foreground">
          {translate(label)}
        </span>
      </div>
      <p className="mt-2 text-2xl font-extrabold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{translate(hint)}</p>}
    </div>
  );
}

const badgeTones = {
  neutral: "bg-secondary text-secondary-foreground",
  primary: "bg-tint-blue text-primary",
  success: "bg-tint-green text-success",
  warning: "bg-tint-amber text-foreground",
  danger: "bg-tint-rose text-destructive",
} as const;

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: keyof typeof badgeTones;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-10 text-center",
        className,
      )}
    >
      {Icon && (
        <span
          className="mb-1 grid h-11 w-11 place-items-center rounded-2xl bg-secondary text-muted-foreground"
          aria-hidden
        >
          <Icon className="h-5 w-5" />
        </span>
      )}
      <p className="font-semibold">{translate(title)}</p>
      {hint && <p className="max-w-sm text-sm text-muted-foreground">{translate(hint)}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={translate(placeholder)}
        aria-label={translate(placeholder)}
        className={cn(field, "pe-9 ps-9 [&::-webkit-search-cancel-button]:hidden")}
      />
      {value && (
        <button
          type="button"
          aria-label={translate("Clear search")}
          onClick={() => onChange("")}
          className="absolute end-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}

export function Card({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl bg-card p-5 shadow-card", className)}>
      {title && <h2 className="mb-4 font-bold">{translate(title)}</h2>}
      {children}
    </section>
  );
}

export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <span className="mb-1.5 block text-sm font-medium">
      {typeof children === "string" ? translate(children) : children}
      {hint && " "}
      {hint && <span className="ms-1 font-normal text-muted-foreground">{translate(hint)}</span>}
    </span>
  );
}

/** Run a write, show a toast, refresh the given content lists. */
export function useSave() {
  const qc = useQueryClient();
  return async (
    fn: () => PromiseLike<{ error: { message: string } | null }>,
    ok: string,
    keys: string[][],
  ) => {
    const { error } = await fn();
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success(translate(ok));
    await Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: k })));
    return true;
  };
}

export function confirmDelete(what: string) {
  return window.confirm(translate("Delete {what}? This can't be undone.", { what }));
}
