import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, Plus, Trash2, UserCog } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isAllowedUniversityEmail } from "@/lib/auth-email";
import { isOwnerQuery } from "@/lib/content";
import { btn, btnDanger, btnGhost, Card, confirmDelete, field, Label, useSave } from "./shared";
import { translate as tr } from "@/lib/i18n";

const KEYS = [["admin-emails"]];

export function AdminsAdmin({ myEmail }: { myEmail: string }) {
  const save = useSave();
  const qc = useQueryClient();
  const me = myEmail.trim().toLowerCase();
  const { data: isOwner = false } = useQuery(isOwnerQuery);
  const { data = [] } = useQuery({
    queryKey: KEYS[0]!,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_emails")
        .select("email, role, created_at")
        .order("role", { ascending: false })
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const [email, setEmail] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [busyTransfer, setBusyTransfer] = useState(false);

  const owner = data.find((a) => a.role === "owner");
  const admins = data.filter((a) => a.role === "admin");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isOwner) {
      toast.error(tr("Only the owner can manage admins."));
      return;
    }
    const v = email.trim().toLowerCase();
    if (!isAllowedUniversityEmail(v)) {
      toast.error(tr("Admins must use a @pua.edu.eg university email."));
      return;
    }
    if (v === owner?.email.toLowerCase()) {
      toast.error(tr("That email is already the owner."));
      return;
    }
    if (
      await save(
        () => supabase.from("admin_emails").insert({ email: v, role: "admin" }),
        "Admin added",
        KEYS,
      )
    ) {
      setEmail("");
    }
  }

  async function transferOwnership(e: React.FormEvent) {
    e.preventDefault();
    if (!isOwner) return;
    const v = transferTo.trim().toLowerCase();
    if (!isAllowedUniversityEmail(v)) {
      toast.error(tr("Owner must use a @pua.edu.eg university email."));
      return;
    }
    if (v === me) {
      toast.error(tr("You are already the owner."));
      return;
    }
    if (!confirm(tr("Transfer ownership to {email}? You will become an admin.", { email: v })))
      return;
    setBusyTransfer(true);
    const { error } = await supabase.rpc("transfer_ownership", { new_owner_email: v });
    setBusyTransfer(false);
    if (error) {
      toast.error(error.message || tr("Something went wrong."));
      return;
    }
    toast.success(tr("Ownership transferred."));
    setTransferTo("");
    await Promise.all([
      qc.invalidateQueries({ queryKey: KEYS[0]! }),
      qc.invalidateQueries({ queryKey: ["is-owner"] }),
      qc.invalidateQueries({ queryKey: ["is-admin"] }),
    ]);
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <Card title="Roles on Studia">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            <span className="font-semibold text-foreground">{tr("Owner")}</span> —{" "}
            {tr("Full admin access. Cannot be removed; can transfer ownership.")}
          </li>
          <li>
            <span className="font-semibold text-foreground">{tr("Admin")}</span> —{" "}
            {tr("Added by the owner. Can manage content; can be removed by the owner.")}
          </li>
          <li>
            <span className="font-semibold text-foreground">{tr("Student")}</span> —{" "}
            {tr("Regular @pua.edu.eg users of the platform.")}
          </li>
        </ul>
      </Card>

      <Card title="Owner">
        {owner ? (
          <div className="flex items-center gap-3 text-sm">
            <Crown className="h-4 w-4 text-primary" />
            <span className="flex-1 font-medium" dir="ltr">
              {owner.email}
              {owner.email.toLowerCase() === me && (
                <span className="ms-2 text-xs text-muted-foreground">{tr("(you)")}</span>
              )}
            </span>
            <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
              {tr("Owner")}
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{tr("No owner is set yet.")}</p>
        )}

        {isOwner && (
          <form onSubmit={transferOwnership} className="mt-4 space-y-2 border-t pt-4">
            <p className="text-sm font-medium">{tr("Transfer ownership")}</p>
            <p className="text-xs text-muted-foreground">
              {tr("The new owner gets full control. You stay as an admin.")}
            </p>
            <div className="flex gap-2">
              <input
                className={field}
                type="email"
                dir="ltr"
                placeholder="2026xxxxxx@pua.edu.eg"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
              />
              <button className={btnGhost} disabled={busyTransfer || !transferTo.trim()}>
                <UserCog className="h-4 w-4" />
                {busyTransfer ? tr("Transferring…") : tr("Transfer")}
              </button>
            </div>
          </form>
        )}
      </Card>

      <Card title="Admins">
        <p className="mb-4 text-sm text-muted-foreground">
          {tr(
            "Admins can manage subjects, files, quizzes, the schedule and announcements. Only the owner can add or remove them.",
          )}
        </p>

        {isOwner && (
          <form onSubmit={submit} className="mb-4 flex gap-2">
            <label className="flex-1">
              <span className="sr-only">
                <Label>Email</Label>
              </span>
              <input
                className={field}
                type="email"
                placeholder="2026xxxxxx@pua.edu.eg"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <button className={btn}>
              <Plus className="h-4 w-4" />
              {tr("Add")}
            </button>
          </form>
        )}

        {admins.length === 0 && (
          <p className="text-sm text-muted-foreground">{tr("No admins yet.")}</p>
        )}
        <ul className="divide-y">
          {admins.map((a) => (
            <li key={a.email} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="flex-1" dir="ltr">
                {a.email}
                {a.email.toLowerCase() === me && (
                  <span className="ms-2 text-xs text-muted-foreground">{tr("(you)")}</span>
                )}
              </span>
              <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium">
                {tr("Admin")}
              </span>
              {isOwner && (
                <button
                  className={btnDanger}
                  aria-label={tr("Remove admin")}
                  onClick={async () => {
                    if (confirmDelete(tr("admin access for {email}", { email: a.email }))) {
                      await save(
                        () => supabase.from("admin_emails").delete().eq("email", a.email),
                        "Admin removed",
                        KEYS,
                      );
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
