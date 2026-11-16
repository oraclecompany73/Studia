import {
  BookOpen,
  CalendarDays,
  ChartColumn,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type AdminSectionId =
  "overview" | "subjects" | "quizzes" | "schedule" | "files" | "students" | "news" | "admins";

export const adminSections: {
  id: AdminSectionId;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "subjects", label: "Subjects & files", icon: BookOpen },
  { id: "quizzes", label: "Quizzes", icon: ListChecks },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "files", label: "File stats", icon: ChartColumn },
  { id: "students", label: "Students", icon: Users },
  { id: "news", label: "Announcements", icon: Megaphone },
  { id: "admins", label: "Admins", icon: ShieldCheck },
];

export function AdminShell({
  active,
  onSelect,
  role,
  email,
  children,
}: {
  active: AdminSectionId;
  onSelect: (id: AdminSectionId) => void;
  role: "owner" | "admin";
  email: string;
  children: ReactNode;
}) {
  const { t } = useI18n();

  const nav = (
    <nav aria-label={t("Admin sections")} className="flex flex-col gap-1">
      {adminSections.map(({ id, label, icon: Icon }) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-elegant"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1">{t(label)}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-20 space-y-4 rounded-2xl bg-sidebar p-3 shadow-card">
          <div className="px-2 pt-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/45">
              {t("Admin panel")}
            </p>
            <p className="mt-1 truncate text-xs text-sidebar-foreground/70" dir="ltr">
              {email}
            </p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary-glow">
              {role === "owner" ? t("Owner") : t("Admin")}
            </span>
          </div>
          {nav}
        </div>
      </aside>

      <div className="min-w-0">
        <div
          className="mb-4 flex gap-1.5 overflow-x-auto pb-1 lg:hidden"
          role="tablist"
          aria-label={t("Admin sections")}
        >
          {adminSections.map(({ id, label, icon: Icon }) => {
            const isActive = id === active;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelect(id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-elegant"
                    : "bg-card text-muted-foreground shadow-card hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {t(label)}
              </button>
            );
          })}
        </div>
        <div key={active} className="fade-up">
          {children}
        </div>
      </div>
    </div>
  );
}

export function SectionSkeleton() {
  return (
    <div className="grid gap-4" aria-hidden>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-card" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-card" />
    </div>
  );
}
