import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, HelpCircle } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/app/EmptyState";
import { quizzesQuery, subjectsQuery } from "@/lib/content";
import { quizDifficulties, quizDifficultyLabel, type QuizDifficulty } from "@/lib/data";
import { progressQuery } from "@/lib/progress";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/quizzes/")({
  head: () => ({
    meta: [
      { title: "Quizzes — Studia" },
      {
        name: "description",
        content: "Timed quizzes with MCQ, true/false, fill-in and essay questions.",
      },
      { property: "og:title", content: "Quizzes — Studia" },
      {
        property: "og:description",
        content: "Timed quizzes with MCQ, true/false, fill-in and essay questions.",
      },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(quizzesQuery),
      context.queryClient.ensureQueryData(subjectsQuery),
      context.queryClient.ensureQueryData(progressQuery),
    ]),
  component: QuizzesPage,
});

const labels = {
  mcq: "Multiple choice",
  truefalse: "True / False",
  fill: "Fill in",
  essay: "Essay",
};

function QuizzesPage() {
  const { t, tn } = useI18n();
  const tr = t;
  const { data: quizzes } = useSuspenseQuery(quizzesQuery);
  const { data: subjects } = useSuspenseQuery(subjectsQuery);
  const { data: progress } = useSuspenseQuery(progressQuery);
  const [filter, setFilter] = useState<"all" | QuizDifficulty>("all");
  const list = quizzes
    .filter((q) => q.questions.length > 0)
    .filter((q) => filter === "all" || q.difficulty === filter);

  return (
    <div className="space-y-6 fade-up">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">{t("Quizzes")}</h1>
        <p className="text-muted-foreground">
          {t("Test yourself and get instant, detailed feedback.")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium",
            filter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground",
          )}
        >
          {t("All difficulties")}
        </button>
        {quizDifficulties.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setFilter(d)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              filter === d
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground",
            )}
          >
            {t(quizDifficultyLabel[d])}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          title={t("No quizzes yet")}
          text={t("Quizzes will appear here once your teachers add them.")}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((q) => {
            const best = progress.attempts
              .filter((a) => a.quiz_id === q.id)
              .reduce((m, a) => Math.max(m, a.percent), -1);
            return (
              <div
                key={q.id}
                className="card-lift flex flex-col rounded-2xl bg-card p-6 shadow-card"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {subjects.find((s) => s.id === q.subject_id)?.name}
                </p>
                <h2 className="mt-1 text-lg font-bold">{q.title}</h2>
                {q.material_id &&
                  (() => {
                    for (const s of subjects) {
                      for (const l of s.lessons) {
                        const m = l.materials.find((x) => x.id === q.material_id);
                        if (m)
                          return (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {m.title} · {l.title}
                            </p>
                          );
                      }
                    }
                    return null;
                  })()}
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <HelpCircle className="h-4 w-4" />
                    {tn(q.questions.length, "{n} question", "{n} questions")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {t("{n} min", { n: q.minutes })}
                  </span>
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                    {t(quizDifficultyLabel[q.difficulty])}
                  </span>
                </div>
                <div className="mt-4 flex flex-1 flex-wrap content-start gap-2">
                  {[...new Set(q.questions.map((x) => x.type))].map((typ) => (
                    <span
                      key={typ}
                      className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                    >
                      {tr(labels[typ])}
                    </span>
                  ))}
                  {best >= 0 && (
                    <span className="rounded-full bg-success px-2.5 py-1 text-xs font-medium text-success-foreground">
                      {t("Best {n}%", { n: best })}
                    </span>
                  )}
                </div>
                <Link
                  to="/quizzes/$quizId"
                  params={{ quizId: q.id }}
                  className="mt-6 rounded-xl bg-primary py-2.5 text-center text-sm font-semibold text-primary-foreground shadow-elegant"
                >
                  {best >= 0 ? t("Retake quiz") : t("Start quiz")}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
