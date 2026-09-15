import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Plus, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export const Route = createFileRoute("/admin/staff")({ component: StaffPage });

type StaffRole = "super_admin" | "reviewer" | "communications" | "viewer";
type StaffMember = {
  user_id: string;
  email: string;
  role: StaffRole;
  permissions: string[];
  active: boolean;
};

const ROLE_LABEL: Record<StaffRole, string> = {
  super_admin: "Super Admin",
  reviewer: "Reviewer",
  communications: "Communications",
  viewer: "Viewer",
};

function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("reviewer");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadStaff = useCallback(async () => {
    const { data, error: loadError } = await getSupabaseBrowserClient().rpc("list_staff_members");
    setLoading(false);
    if (loadError) {
      setError("Staff access could not be loaded.");
      return;
    }
    setStaff((data ?? []) as StaffMember[]);
  }, []);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  const assignRole = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    const { error: assignError } = await getSupabaseBrowserClient().rpc("assign_staff_role", {
      target_email: email.trim().toLowerCase(),
      target_role: role,
    });
    setSaving(false);
    if (assignError) {
      setError(
        assignError.message.includes("account_not_found")
          ? "That person must create an account before you can assign a role."
          : "The role could not be assigned. Check your permission and try again.",
      );
      return;
    }
    setEmail("");
    setMessage("Administrator access updated.");
    await loadStaff();
  };

  const deactivate = async (userId: string) => {
    setError("");
    setMessage("");
    const { error: deactivateError } = await getSupabaseBrowserClient().rpc(
      "deactivate_staff_member",
      { target_user_id: userId },
    );
    if (deactivateError) {
      setError(
        deactivateError.message.includes("last_super_admin")
          ? "You cannot deactivate the last active super administrator."
          : "That administrator could not be deactivated.",
      );
      return;
    }
    setMessage("Administrator access deactivated.");
    await loadStaff();
  };

  return (
    <div>
      <div>
        <p className="text-sm font-bold text-brand-orange">Scholarship panel</p>
        <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Administrators & access</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Assign access after the person has created and confirmed their account.
        </p>
      </div>

      <section className="mt-7 rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-bold">Assign an administrator role</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="staff-email">Account email</Label>
            <Input
              id="staff-email"
              type="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="person@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-role">Role</Label>
            <select
              id="staff-role"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={role}
              onChange={(event) => setRole(event.target.value as StaffRole)}
            >
              {Object.entries(ROLE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <Button disabled={saving || !email.trim()} onClick={() => void assignRole()}>
            <Plus className="mr-2 h-4 w-4" />
            {saving ? "Assigning…" : "Assign role"}
          </Button>
        </div>
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        {message && <p className="mt-4 text-sm font-semibold text-brand-green-dark">{message}</p>}
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading administrators…</p>
        ) : staff.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No administrators have been added.</p>
        ) : (
          <div className="divide-y divide-border">
            {staff.map((member) => (
              <article
                key={member.user_id}
                className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5"
              >
                <div className="min-w-0">
                  <p className="break-all font-bold">{member.email}</p>
                  <p className="mt-2 inline-flex items-center gap-1 text-sm font-semibold">
                    <ShieldCheck className="h-4 w-4 text-brand-green" />
                    {ROLE_LABEL[member.role]}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {member.active ? (
                      <span className="inline-flex items-center gap-1">
                        <UserCheck className="h-3.5 w-3.5" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <UserX className="h-3.5 w-3.5" /> Inactive
                      </span>
                    )}
                  </p>
                </div>
                {member.active && (
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => void deactivate(member.user_id)}
                  >
                    Deactivate
                  </Button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
