import { useSuspenseQuery } from "@tanstack/react-query";
import {
  BookOpen,
  CalendarClock,
  CalendarDays,
  FileText,
  ListChecks,
  Megaphone,
  Plus,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  adminQuizzesQuery,
  announcementsQuery,
  eventsQuery,
  subjectsQuery,
  type StudyEvent,
} from "@/lib/content";
import { dueTypes, type AnnouncementKind, type EventType } from "@/lib/data";
import { timeAgo } from "@/lib/notifications";
import { translate as tr, useI18n } from "@/lib/i18n";
import type { AdminSectionId } from "./AdminShell";
import { accountsQuery } from "./StudentsAdmin";
import { Badge, EmptyState, SectionCard, StatCard, btnGhost } from "./shared";
import { cn } from "@/lib/utils";

const typeTone: Record<EventType, "primary" | "success" | "warning" | "danger" | "neutral"> = {
  class: "primary",
  lecture: "neutral",
  study: "success",
  deadline: "danger",
  quiz: "warning",
  exam: "danger",
  assignment: "primary",
};

const kindTone: Record<AnnouncementKind, "primary" | "success" | "warning" | "neutral"> = {
  news: "primary",
  quiz: "warning",
  material: "success",
  schedule: "neutral",
};

const kindLabel: Record<AnnouncementKind, string> = {
  news: "News",
  quiz: "Quiz",
  material: "New material",
  schedule: "Schedule change",
};

export function Overview({ onNavigate }: { onNavigate: (id: AdminSectionId) => void }) {
  const { t, locale } = useI18n();
  const { data: subjects } = useSuspenseQuery(subjectsQuery);
  const { data: events } = useSuspenseQuery(eventsQuery);
  const { data: quizzes } = useSuspenseQuery(adminQuizzesQuery);
  const { data: announcements } = useSuspenseQuery(announcementsQuery);
  const { data: students } = useSuspenseQuery(accountsQuery);

  const lessons = subjects.reduce((n, s) => n + s.lessons.length, 0);
  const files = subjects.reduce(
    (n, s) => n + s.lessons.reduce((m, l) => m + l.materials.length, 0),
    0,
  );
  const upcoming = events
    .filter((e) => new Date(e.ends_at ?? e.starts_at).getTime() >= Date.now() - 864e5)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const dueSoon = upcoming.filter((e) => dueTypes.includes(e.type));

  const actions: { id: AdminSectionId; label: string; icon: LucideIcon }[] = [
    { id: "subjects", label: "New subject", icon: Plus },
    { id: "quizzes", label: "New quiz", icon: ListChecks },
    { id: "schedule", label: "Add to schedule", icon: CalendarDays },
    { id: "news", label: "New announcement", icon: Megaphone },
  ];

  return (
    <div className="space-y-4">
      {subjects.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Add your first subject"
          hint="Subjects are the home for lessons, files and quizzes."
          action={
            <button className={btnGhost} onClick={() => onNavigate("subjects")}>
              <Plus className="h-4 w-4" />
              {tr("New subject")}
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard label="Subjects" value={subjects.length} icon={BookOpen} />
          <StatCard label="Lessons" value={lessons} icon={BookOpen} tone="blue" />
          <StatCard label="Lesson files" value={files} icon={FileText} tone="green" />
          <StatCard label="Quizzes" value={quizzes.length} icon={ListChecks} tone="amber" />
          <StatCard label="Students" value={students.length} icon={Users} />
          <StatCard
            label="Due soon"
            value={dueSoon.length}
            icon={CalendarClock}
            tone="rose"
            hint="Quizzes, exams and deadlines ahead"
          />
        </div>
      )}

      <SectionCard title="Quick actions">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className="card-lift flex items-center gap-2.5 rounded-xl bg-secondary px-4 py-3 text-start text-sm font-semibold text-secondary-foreground hover:bg-secondary/80"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              {t(label)}
            </button>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Upcoming"
          actions={
            upcoming.length > 0 && (
              <button className={btnGhost} onClick={() => onNavigate("schedule")}>
                {tr("View all")}
              </button>
            )
          }
          bodyClassName="space-y-2"
        >
          {upcoming.length === 0 && (
            <p className="text-sm text-muted-foreground">{tr("Nothing scheduled.")}</p>
          )}
          {upcoming.slice(0, 5).map((e) => (
            <UpcomingRow
              key={e.id}
              event={e}
              locale={locale}
              subjectName={subjects.find((s) => s.id === e.subject_id)?.name}
            />
          ))}
        </SectionCard>

        <SectionCard
          title="Latest announcements"
          actions={
            announcements.length > 0 && (
              <button className={btnGhost} onClick={() => onNavigate("news")}>
                {tr("View all")}
              </button>
            )
          }
          bodyClassName="space-y-2"
        >
          {announcements.length === 0 && (
            <p className="text-sm text-muted-foreground">{tr("No announcements yet.")}</p>
          )}
          {announcements.slice(0, 5).map((n) => (
            <div key={n.id} className="rounded-xl border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 truncate font-semibold">{n.title}</p>
                <Badge tone={kindTone[n.kind] ?? "neutral"}>
                  {tr(kindLabel[n.kind] ?? n.kind)}
                </Badge>
              </div>
              {n.body && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{n.body}</p>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</p>
            </div>
          ))}
        </SectionCard>
      </div>
    </div>
  );
}

function UpcomingRow({
  event,
  locale,
  subjectName,
}: {
  event: StudyEvent;
  locale: string;
  subjectName?: string | undefined;
}) {
  const { t } = useI18n();
  const d = new Date(event.starts_at);
  return (
    <div className="flex items-center gap-3 rounded-xl border p-3">
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-lg text-primary-foreground",
          event.type === "study" && "bg-success",
          event.type === "deadline" && "bg-destructive",
          event.type === "quiz" && "bg-warning text-foreground",
          event.type === "exam" && "bg-destructive",
          (event.type === "class" || event.type === "assignment" || event.type === "lecture") &&
            "bg-primary",
        )}
        aria-hidden
      >
        <CalendarDays className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{event.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {d.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
          {subjectName ? ` · ${subjectName}` : ""}
        </p>
      </div>
      <Badge tone={typeTone[event.type] ?? "neutral"}>{t(event.type)}</Badge>
    </div>
  );
}
