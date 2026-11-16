import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Activity, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { translate as tr, useI18n } from "@/lib/i18n";
import { Badge, SearchField, SectionCard, StatCard } from "./shared";

export type Account = {
  user_id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  provider: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
};

export const accountsQuery = queryOptions({
  queryKey: ["student-accounts"],
  queryFn: async () => {
    const { data, error } = await supabase.rpc("admin_student_accounts");
    if (error) throw error;
    return (data ?? []) as Account[];
  },
});

export function StudentsAdmin() {
  const { t, locale } = useI18n();
  const { data } = useSuspenseQuery(accountsQuery);
  const [q, setQ] = useState("");
  const fmt = (d: string | null) =>
    d
      ? new Date(d).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })
      : t("Never");
  const week = Date.now() - 7 * 864e5;
  const activeWeek = data.filter(
    (a) => a.last_sign_in_at && new Date(a.last_sign_in_at).getTime() > week,
  ).length;
  const newWeek = data.filter((a) => new Date(a.created_at).getTime() > week).length;
  const needle = q.trim().toLowerCase();
  const list = data.filter((a) => `${a.full_name} ${a.email}`.toLowerCase().includes(needle));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total students" value={data.length} icon={Users} />
        <StatCard label="Signed in this week" value={activeWeek} icon={Activity} tone="green" />
        <StatCard label="New this week" value={newWeek} icon={UserPlus} tone="blue" />
      </div>

      <SectionCard
        title="Student accounts"
        hint="Everyone who signed up with a university email."
        bodyClassName="space-y-4"
      >
        <SearchField value={q} onChange={setQ} placeholder="Search by name or email" />
        {list.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {needle ? tr("No students found.") : tr("No students yet.")}
          </p>
        )}
        <div className="space-y-2">
          {list.map((a) => (
            <div
              key={a.user_id}
              className="flex flex-wrap items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-secondary/40"
            >
              {a.avatar_url ? (
                <img
                  src={a.avatar_url}
                  alt=""
                  className="h-10 w-10 rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-semibold">
                  {(a.full_name || a.email || "?")[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{a.full_name || a.email}</p>
                <p className="truncate text-xs text-muted-foreground" dir="ltr">
                  {a.email}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={a.provider === "google" ? "primary" : "neutral"}>
                  {a.provider === "google"
                    ? "Google"
                    : tr(a.provider === "email" ? "Email" : a.provider)}
                </Badge>
                {!a.email_confirmed_at && <Badge tone="warning">{tr("Unconfirmed")}</Badge>}
              </div>
              <div className="grid w-full gap-x-6 gap-y-1 text-xs sm:w-auto sm:grid-cols-2 lg:grid-cols-3">
                <span>
                  <span className="text-muted-foreground">{t("Signed up")}: </span>
                  {fmt(a.created_at)}
                </span>
                <span>
                  <span className="text-muted-foreground">{t("Last sign-in")}: </span>
                  {fmt(a.last_sign_in_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
