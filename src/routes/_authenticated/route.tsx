import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { isAllowedUniversityEmail } from "@/lib/auth-email";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  pendingMs: 200,
  pendingComponent: AuthPending,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/" });
    if (!isAllowedUniversityEmail(data.user.email)) {
      await supabase.auth.signOut();
      throw redirect({ to: "/", search: { reason: "university-email" } });
    }
    return { user: data.user };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});

function AuthPending() {
  const { t } = useI18n();
  return (
    <AppShell>
      <div
        className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground"
        role="status"
      >
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden
        />
        <p className="text-sm font-medium">{t("Loading…")}</p>
      </div>
    </AppShell>
  );
}
