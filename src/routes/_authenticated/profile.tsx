import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { BookCheck, Flame, ListChecks, LogOut, ShieldCheck, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { computeStreaks, progressQuery } from "@/lib/progress";
import { isAdminQuery } from "@/lib/content";
import { supabase } from "@/integrations/supabase/client";

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

  const streak = computeStreaks([
    ...progress.lessons.map((l) => new Date(l.completed_at)),
    ...progress.attempts.map((a) => new Date(a.taken_at)),
  ]);
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

  const companions = [
    { label: t("Best streak"), value: tn(streak.best, "{n} day", "{n} days"), icon: Trophy },
    { label: t("Lessons completed"), value: String(progress.lessons.length), icon: BookCheck },
    { label: t("Quizzes done"), value: String(progress.attempts.length), icon: ListChecks },
    ...(avg !== null ? [{ label: t("Avg. quiz score"), value: `${avg}%`, icon: ListChecks }] : []),
  ].slice(0, 3);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 fade-up">
      {/* Campus identity card — signature piece */}
      <section className="relative overflow-hidden rounded-[1.75rem] border border-primary/20 bg-card shadow-elegant">
        <div
          className="absolute inset-y-0 start-0 w-2 bg-gradient-to-b from-primary via-primary-glow to-navy"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -end-20 top-0 h-48 w-48 rounded-full bg-primary/15 blur-3xl"
          aria-hidden
        />

        <div className="relative grid gap-8 p-6 ps-7 md:grid-cols-[auto_1fr] md:items-center md:p-8 md:ps-10">
          <div className="relative mx-auto md:mx-0">
            <div className="grid h-32 w-32 place-items-center overflow-hidden rounded-[1.5rem] bg-hero text-4xl font-extrabold text-primary-foreground shadow-elegant ring-4 ring-background">
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
          </div>

          <div className="min-w-0 space-y-3 text-center md:text-start">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              {t("Student card")}
            </p>
            <h1 className="truncate text-3xl font-extrabold tracking-tight md:text-4xl">{name}</h1>
            <p className="font-mono text-sm text-muted-foreground" dir="ltr">
              {user.email}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                {t("ID")}: <span dir="ltr">{studentId}</span>
              </span>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                @pua.edu.eg
              </span>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" /> {t("Admin")}
                </span>
              )}
            </div>
            {joined && (
              <p className="text-sm text-muted-foreground">
                {t("Joined {date}", { date: joined })}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Signature metric: streak days as the study pulse */}
      <section className="relative overflow-hidden rounded-[1.75rem] bg-hero p-8 text-primary-foreground shadow-elegant">
        <div className="pointer-events-none absolute -end-8 -top-10 opacity-20" aria-hidden>
          <Flame className="h-40 w-40" />
        </div>
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium opacity-80">{t("Study streak")}</p>
            <p className="mt-2 text-6xl font-extrabold tracking-tight tabular-nums md:text-7xl">
              {streak.current}
            </p>
            <p className="mt-1 text-lg font-semibold opacity-85">
              {t(streak.current === 1 ? "day in a row" : "days in a row")}
            </p>
            <p className="mt-2 max-w-sm text-sm opacity-75">
              {streak.current > 0
                ? t("Keep showing up — your streak grows with each lesson or quiz.")
                : t("Complete a lesson or quiz today to start a streak.")}
            </p>
          </div>
          <Button asChild className="shrink-0 bg-card text-foreground hover:bg-card/90">
            <Link to="/progress">{t("Open progress")}</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {companions.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border bg-card p-5 shadow-card">
            <Icon className="h-5 w-5 text-primary" aria-hidden />
            <p className="mt-4 text-2xl font-extrabold tracking-tight tabular-nums">{value}</p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
          </div>
        ))}
      </section>

      <div className="flex justify-end">
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" /> {t("Sign out")}
        </Button>
      </div>
    </div>
  );
}
