import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  Bell,
  BookCheck,
  ChevronRight,
  Flame,
  ListChecks,
  LogOut,
  ShieldCheck,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubjectIcon } from "@/components/app/SubjectIcon";
import { isAdminQuery, subjectProgress, subjectsQuery } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { computeStreaks, dayKey, progressQuery } from "@/lib/progress";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Studia" },
      { name: "description", content: "Your Studia study identity and progress snapshot." },
      { property: "og:title", content: "Profile — Studia" },
      { property: "og:description", content: "Your Studia study identity and progress snapshot." },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(progressQuery),
      context.queryClient.ensureQueryData(subjectsQuery),
      context.queryClient.ensureQueryData(isAdminQuery),
    ]),
  component: ProfilePage,
});

function ProfilePage() {
  const { t, tn, locale } = useI18n();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: progress } = useSuspenseQuery(progressQuery);
  const { data: subjects } = useSuspenseQuery(subjectsQuery);
  const { data: isAdmin } = useSuspenseQuery(isAdminQuery);

  const meta = user.user_metadata as { full_name?: string; avatar_url?: string; picture?: string };
  const name = meta.full_name ?? user.email ?? t("Student");
  const avatar = meta.avatar_url ?? meta.picture;
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const studentId = (user.email ?? "").split("@")[0] || "—";

  const activityDates = [
    ...progress.lessons.map((l) => new Date(l.completed_at)),
    ...progress.attempts.map((a) => new Date(a.taken_at)),
  ];
  const streak = computeStreaks(activityDates);
  const activeDays = new Set(activityDates.map(dayKey));
  const doneKeys = new Set(progress.lessons.map((l) => l.lesson_key));
  const avg = progress.attempts.length
    ? Math.round(progress.attempts.reduce((n, a) => n + a.percent, 0) / progress.attempts.length)
    : null;

  const joined = user.created_at
    ? new Date(user.created_at).toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  // Last 7 local days, oldest first, with a dot per active day.
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      key: dayKey(d),
      letter: d.toLocaleDateString(locale, { weekday: "narrow" }),
      dayNum: d.getDate(),
      active: activeDays.has(dayKey(d)),
      isToday: i === 6,
    };
  });

  const subjectRows = subjects
    .filter((s) => s.lessons.length > 0)
    .map((s) => ({
      id: s.id,
      name: s.name,
      icon: s.icon,
      pct: subjectProgress(s, doneKeys),
    }))
    .sort((a, b) => b.pct - a.pct);

  const stats = [
    {
      label: t("Study streak"),
      value: String(streak.current),
      icon: Flame,
      tone: "amber" as const,
      sub: tn(streak.current, "{n} day", "{n} days"),
    },
    {
      label: t("Best streak"),
      value: String(streak.best),
      icon: Trophy,
      tone: "primary" as const,
      sub: (
        <>
          <span className="tabular-nums">{streak.activeDays}</span> {t("Active days")}
        </>
      ),
    },
    {
      label: t("Lessons completed"),
      value: String(progress.lessons.length),
      icon: BookCheck,
      tone: "green" as const,
    },
    {
      label: t("Quizzes done"),
      value: String(progress.attempts.length),
      icon: ListChecks,
      tone: "blue" as const,
      sub: avg !== null ? `${t("Avg. quiz score")}: ${avg}%` : undefined,
    },
  ];

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 fade-up">
      {/* Identity band */}
      <section className="relative overflow-hidden rounded-3xl bg-hero p-6 text-primary-foreground shadow-elegant md:p-8">
        <div
          className="pointer-events-none absolute -end-16 -top-20 h-52 w-52 rounded-full bg-white/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -start-10 bottom-0 h-32 w-32 rounded-full bg-primary-glow/20 blur-2xl"
          aria-hidden
        />
        <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-start">
          <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-3xl bg-card text-3xl font-extrabold text-primary ring-4 ring-white/20 md:h-28 md:w-28">
            {avatar ? (
              <img
                src={avatar}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-extrabold tracking-tight md:text-3xl">{name}</h1>
            <p className="mt-0.5 truncate text-sm text-primary-foreground/75" dir="ltr">
              {user.email}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/15">
                {t("ID")}: <span dir="ltr">{studentId}</span>
              </span>
              <span
                className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/15"
                dir="ltr"
              >
                @pua.edu.eg
              </span>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/20">
                  <ShieldCheck className="h-3.5 w-3.5" /> {t("Admin")}
                </span>
              )}
              {joined && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/15">
                  {t("Joined {date}", { date: joined })}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tone, sub }) => (
          <div key={label} className="card-lift rounded-2xl bg-card p-4 shadow-card">
            <span
              className={cn(
                "grid h-9 w-9 place-items-center rounded-xl",
                tone === "amber" && "bg-tint-amber text-foreground",
                tone === "primary" && "bg-tint-blue text-primary",
                tone === "green" && "bg-tint-green text-success",
                tone === "blue" && "bg-tint-blue text-primary",
              )}
            >
              <Icon className="h-4.5 w-4.5" aria-hidden />
            </span>
            <p className="mt-3 text-2xl font-extrabold tracking-tight tabular-nums">{value}</p>
            <p className="mt-0.5 text-xs font-semibold">{label}</p>
            {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
          </div>
        ))}
      </section>

      {/* Activity + per-subject progress */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-card p-5 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold">{t("Last 7 days")}</p>
            <Flame
              className={cn(
                "h-5 w-5",
                streak.current > 0 ? "text-primary" : "text-muted-foreground",
              )}
              aria-hidden
            />
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1 text-center">
            {last7.map((d) => (
              <div key={d.key}>
                <div
                  aria-current={d.isToday ? "date" : undefined}
                  className={cn(
                    "mx-auto grid h-9 w-9 place-items-center rounded-full text-xs font-bold transition-colors",
                    d.active
                      ? "bg-primary text-primary-foreground shadow-elegant"
                      : "bg-secondary text-muted-foreground",
                    d.isToday && !d.active && "ring-2 ring-primary/40",
                  )}
                >
                  {d.dayNum}
                </div>
                <p className="mt-1 text-[10px] font-medium text-muted-foreground">{d.letter}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {streak.current > 0
              ? t("Keep showing up — your streak grows with each lesson or quiz.")
              : t("Complete a lesson or quiz today to start a streak.")}
          </p>
        </div>

        <div className="rounded-2xl bg-card p-5 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold">{t("Progress by subject")}</p>
            <Link to="/progress" className="text-xs font-semibold text-primary hover:underline">
              {t("Open progress")}
            </Link>
          </div>
          {subjectRows.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              {t("No lessons yet — open a subject to start.")}
            </p>
          ) : (
            <div className="mt-4 space-y-2.5">
              {subjectRows.map((r) => (
                <Link
                  key={r.id}
                  to="/subjects/$subjectId"
                  params={{ subjectId: r.id }}
                  className="block rounded-xl border p-3 transition-colors hover:bg-secondary/50"
                >
                  <div className="flex items-center gap-2">
                    <SubjectIcon icon={r.icon} className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{r.name}</span>
                    <span className="text-xs font-bold tabular-nums">{r.pct}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-[width]"
                      style={{ width: `${r.pct}%` }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Account */}
      <section className="rounded-2xl bg-card p-5 shadow-card">
        <p className="font-bold">{t("Account")}</p>
        <div className="mt-3 divide-y overflow-hidden rounded-xl border">
          <RowLink to="/progress" icon={TrendingUp} label={t("Open progress")} />
          <RowLink to="/notifications" icon={Bell} label={t("Notification settings")} />
          {isAdmin && <RowLink to="/admin" icon={ShieldCheck} label={t("Admin panel")} />}
        </div>
        <Button
          variant="ghost"
          onClick={signOut}
          className="mt-4 w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" /> {t("Sign out")}
        </Button>
      </section>
    </div>
  );
}

function RowLink({
  to,
  icon: Icon,
  label,
}: {
  to: "/progress" | "/notifications" | "/admin";
  icon: typeof Bell;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-secondary/60"
    >
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-primary">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="flex-1">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" aria-hidden />
    </Link>
  );
}
