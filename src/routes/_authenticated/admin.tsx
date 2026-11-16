import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Navigate, redirect } from "@tanstack/react-router";
import { Suspense, useState, type ReactNode } from "react";
import { AdminShell, SectionSkeleton, type AdminSectionId } from "@/components/admin/AdminShell";
import { Overview } from "@/components/admin/Overview";
import { SubjectsAdmin } from "@/components/admin/SubjectsAdmin";
import { QuizzesAdmin } from "@/components/admin/QuizzesAdmin";
import { EventsAdmin } from "@/components/admin/EventsAdmin";
import { FileStatsAdmin } from "@/components/admin/FileStatsAdmin";
import { StudentsAdmin } from "@/components/admin/StudentsAdmin";
import { AnnouncementsAdmin } from "@/components/admin/AnnouncementsAdmin";
import { AdminsAdmin } from "@/components/admin/AdminsAdmin";
import { isAdminQuery, isOwnerQuery } from "@/lib/content";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin panel — Studia" },
      {
        name: "description",
        content: "Manage subjects, lessons, files, quizzes, the schedule and announcements.",
      },
      { property: "og:title", content: "Admin panel — Studia" },
      {
        property: "og:description",
        content: "Manage subjects, lessons, files, quizzes, the schedule and announcements.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data, error } = await supabase.rpc("is_admin");
    if (error || !data) throw redirect({ to: "/dashboard" });
  },
  component: AdminPage,
});

function AdminPage() {
  const { t } = useI18n();
  const { user } = Route.useRouteContext();
  // Defense in depth with beforeLoad; keeps UI reactive if role changes mid-session.
  const { data: isAdmin, isLoading } = useQuery(isAdminQuery);
  const { data: isOwner } = useQuery(isOwnerQuery);
  const [section, setSection] = useState<AdminSectionId>("overview");

  if (isLoading) return <div className="h-96 animate-pulse rounded-2xl bg-card" />;
  if (!isAdmin) return <Navigate to="/dashboard" />;

  const sections: Record<AdminSectionId, ReactNode> = {
    overview: <Overview onNavigate={setSection} />,
    subjects: <SubjectsAdmin />,
    quizzes: <QuizzesAdmin />,
    schedule: <EventsAdmin />,
    files: <FileStatsAdmin />,
    students: <StudentsAdmin />,
    news: <AnnouncementsAdmin />,
    admins: <AdminsAdmin myEmail={user.email ?? ""} />,
  };

  return (
    <div className="space-y-6 fade-up">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">{t("Admin panel")}</h1>
        <p className="text-muted-foreground">
          {t("Everything you add here appears for all students straight away.")}
        </p>
      </div>
      <AdminShell
        active={section}
        onSelect={setSection}
        role={isOwner ? "owner" : "admin"}
        email={user.email ?? ""}
      >
        <Suspense fallback={<SectionSkeleton />}>{sections[section]}</Suspense>
      </AdminShell>
    </div>
  );
}
