import { Link, useNavigate, useRouteContext, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/lib/theme";
import { LanguageToggle, useI18n } from "@/lib/i18n";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  WifiOff,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { setupOffline, useOnline } from "@/lib/offline";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { NotificationsProvider, useNotifications } from "@/lib/notifications";
import { useQuery } from "@tanstack/react-query";
import { isAdminQuery } from "@/lib/content";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/subjects", label: "Subjects", icon: BookOpen },
  { to: "/schedule", label: "Schedule", icon: CalendarDays },
  { to: "/quizzes", label: "Quizzes", icon: ListChecks },
  { to: "/progress", label: "Progress", icon: TrendingUp },
  { to: "/study-plan", label: "Study plan", icon: Sparkles },
  { to: "/notifications", label: "Alerts", icon: Bell },
] as const;

/** Bottom bar: Progress included; Alerts stay in the header bell. */
const mobileNav = [
  "/dashboard",
  "/subjects",
  "/schedule",
  "/quizzes",
  "/progress",
  "/study-plan",
] as const;

function isActive(path: string, to: string) {
  return path.startsWith(to);
}

function userBits(
  user: { email?: string | null; user_metadata?: Record<string, unknown> },
  studentLabel: string,
) {
  const meta = (user.user_metadata ?? {}) as { full_name?: string; avatar_url?: string };
  const name = meta.full_name ?? user.email ?? studentLabel;
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return { meta, name, initials };
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <NotificationsProvider>
      <Shell>{children}</Shell>
    </NotificationsProvider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { data: isAdmin } = useQuery(isAdminQuery);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const closeMenuRef = useRef<HTMLButtonElement>(null);
  const online = useOnline();
  useEffect(() => {
    void setupOffline();
  }, []);

  useEffect(() => {
    if (!open) return;
    closeMenuRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const items = [
    ...nav,
    ...(isAdmin ? [{ to: "/admin", label: "Admin panel", icon: ShieldCheck } as const] : []),
  ];

  const links = (
    <nav className="flex flex-col gap-1" aria-label={t("Menu")}>
      <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/45">
        {t("Navigate")}
      </p>
      {items.map(({ to, label, icon: Icon }) => {
        const active = isActive(path, to);
        const admin = to === "/admin";
        return (
          <Link
            key={to}
            to={to}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-2xl px-2.5 py-2.5 text-[15px] font-medium transition-all duration-200",
              admin && "mt-3",
              active
                ? "bg-primary/18 text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--primary)_35%,transparent)]"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground",
            )}
          >
            {active && (
              <span className="absolute inset-y-2 start-0 w-1 rounded-full bg-primary shadow-[0_0_12px_color-mix(in_oklab,var(--primary)_70%,transparent)]" />
            )}
            <span
              className={cn(
                "grid h-9 w-9 place-items-center rounded-xl transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-elegant"
                  : "bg-white/5 text-sidebar-foreground/80 group-hover:bg-white/10 group-hover:text-primary-glow",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="flex-1 text-start">{t(label)}</span>
            {active && <ChevronLeft className="h-4 w-4 opacity-50 rtl:rotate-180" aria-hidden />}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <Link
      to="/dashboard"
      className="group flex items-center gap-3 px-1"
      onClick={() => setOpen(false)}
    >
      <div className="relative grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-elegant transition-transform group-hover:scale-[1.03]">
        <GraduationCap className="h-5 w-5" />
        <span
          className="absolute -inset-1 -z-10 rounded-2xl bg-primary/40 blur-md opacity-60"
          aria-hidden
        />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-extrabold tracking-tight text-sidebar-accent-foreground">
          {t("Studia")}
        </p>
        <p className="text-[11px] font-medium text-sidebar-foreground/50">
          {t("PUA study companion")}
        </p>
      </div>
    </Link>
  );

  const sidebarInner = (
    <>
      <div className="relative">
        <div
          className="pointer-events-none absolute -inset-x-5 -top-5 h-40 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--primary)_28%,transparent),transparent_70%)]"
          aria-hidden
        />
        {brand}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pe-1">{links}</div>
      <SidebarUser onNavigate={() => setOpen(false)} />
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        {t("Skip to content")}
      </a>

      <aside className="fixed inset-y-0 start-0 z-30 hidden w-72 flex-col gap-5 border-e border-sidebar-border/60 bg-sidebar p-5 lg:flex">
        {sidebarInner}
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={t("Menu")}
        >
          <div
            className="absolute inset-0 bg-navy/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="fade-up absolute inset-y-0 start-0 flex w-[min(20rem,88vw)] flex-col gap-5 border-e border-sidebar-border/60 bg-sidebar p-5 shadow-elegant">
            <div className="flex items-start justify-between gap-3">
              {brand}
              <button
                ref={closeMenuRef}
                type="button"
                aria-label={t("Close menu")}
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-xl text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{links}</div>
            <SidebarUser onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:ps-72">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-xl md:px-8">
          <button
            type="button"
            aria-label={t("Open menu")}
            aria-expanded={open}
            className="grid h-10 w-10 place-items-center rounded-full hover:bg-secondary lg:hidden"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-1 rounded-full border bg-card/60 p-1 shadow-card">
            <LanguageToggle />
            <ThemeToggle />
            <NotificationBell />
          </div>
          <UserMenu />
        </header>
        {!online && (
          <div className="flex items-center justify-center gap-2 bg-navy px-4 py-2 text-center text-sm text-navy-foreground">
            <WifiOff className="h-4 w-4" />{" "}
            {t("You're offline — saved lessons are still available.")}
          </div>
        )}
        <main
          id="main-content"
          className="mx-auto max-w-6xl px-4 py-6 pb-28 sm:px-6 md:px-10 md:py-10 lg:pb-12"
        >
          {children}
        </main>
      </div>

      <nav className="pb-safe fixed inset-x-2 bottom-3 z-30 grid grid-cols-6 rounded-2xl border bg-card/90 p-1 shadow-card backdrop-blur-xl lg:hidden">
        {nav
          .filter((n) => (mobileNav as readonly string[]).includes(n.to))
          .map(({ to, label, icon: Icon }) => {
            const active = isActive(path, to);
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium transition-colors sm:text-[11px]",
                  active
                    ? "bg-nav-active text-primary"
                    : "text-muted-foreground active:bg-secondary",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="max-w-full truncate px-0.5">{t(label)}</span>
              </Link>
            );
          })}
      </nav>
    </div>
  );
}

function SidebarUser({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const { user } = useRouteContext({ from: "/_authenticated" });
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { meta, name, initials } = userBits(user, t("Student"));
  const active = path.startsWith("/profile");

  return (
    <Link
      to="/profile"
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "mt-auto block rounded-2xl border border-white/8 bg-gradient-to-br from-primary/20 via-sidebar-accent to-sidebar-accent p-3 transition-transform hover:-translate-y-0.5",
        active && "border-primary/45 from-primary/30",
      )}
    >
      <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/45">
        {t("Profile")}
      </p>
      <span className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-elegant">
          {meta.avatar_url ? (
            <img
              src={meta.avatar_url}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            initials
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-sidebar-accent-foreground">
            {name}
          </span>
          <span className="block truncate text-[11px] text-sidebar-foreground/60" dir="ltr">
            {user.email}
          </span>
        </span>
        <UserRound className="h-4 w-4 shrink-0 text-primary-glow" aria-hidden />
      </span>
    </Link>
  );
}

function NotificationBell() {
  const { t } = useI18n();
  const { notices, unread, markAllRead } = useNotifications();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label={t("Notifications")}
          className="relative grid h-9 w-9 place-items-center rounded-full hover:bg-secondary"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -end-0.5 -top-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="font-semibold">{t("Notifications")}</p>
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            {t("Mark all read")}
          </Button>
        </div>
        <ul className="max-h-80 overflow-auto">
          {notices.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">
              {t("No announcements yet.")}
            </li>
          )}
          {notices.slice(0, 6).map((n) => (
            <li
              key={n.id}
              className={cn("border-b px-4 py-3 last:border-0", !n.read && "bg-secondary/60")}
            >
              <p className="text-sm font-medium">{n.heading}</p>
              <p className="text-xs text-muted-foreground">{n.text}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{n.time}</p>
            </li>
          ))}
        </ul>
        <Link
          to="/notifications"
          className="block border-t px-4 py-2.5 text-center text-sm font-medium text-primary"
        >
          {t("Notification settings")}
        </Link>
      </PopoverContent>
    </Popover>
  );
}

function UserMenu() {
  const { t } = useI18n();
  const { user } = useRouteContext({ from: "/_authenticated" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { meta, name, initials } = userBits(user, t("Student"));

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label={t("Account")}
          className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-primary text-sm font-semibold text-primary-foreground ring-2 ring-primary/25"
        >
          {meta.avatar_url ? (
            <img
              src={meta.avatar_url}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            initials
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <p className="truncate font-semibold">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        <Button variant="outline" className="mt-4 w-full" asChild>
          <Link to="/profile">
            <UserRound className="h-4 w-4" /> {t("View profile")}
          </Link>
        </Button>
        <Button
          variant="ghost"
          className="mt-2 w-full text-destructive hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" /> {t("Sign out")}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
