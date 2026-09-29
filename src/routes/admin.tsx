import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/admin")({
  head: () =>
    seoHead({
      title: "Scholarship Administration | The Free School Foundation",
      description: "Restricted scholarship administration area.",
      path: "/admin",
      noIndex: true,
    }),
  component: AdminRoute,
});

function AdminRoute() {
  const [access, setAccess] = useState<"loading" | "allowed" | "denied">("loading");

  useEffect(() => {
    let active = true;

    const verify = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        if (!user) {
          if (active) setAccess("denied");
          return;
        }
        const isSuperAdminEmail =
          user.email === "officialnwachukwudivine@gmail.com" ||
          user.email?.endsWith("@thefreeschoolfoundation.com.ng");

        const { data, error } = await supabase
          .from("staff_profiles")
          .select("active")
          .eq("user_id", user.id)
          .eq("active", true)
          .maybeSingle();

        if (active) {
          if ((!error && data?.active) || isSuperAdminEmail) {
            setAccess("allowed");
          } else {
            setAccess("denied");
          }
        }
      } catch (err) {
        console.error("Admin verification error:", err);
        if (active) setAccess("denied");
      }
    };

    void verify();

    return () => {
      active = false;
    };
  }, []);

  if (access === "loading")
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-green border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Checking admin access…</p>
        </div>
      </div>
    );

  if (access === "denied")
    return (
      <div className="grid min-h-screen place-items-center bg-secondary/30 px-4">
        <div className="max-w-md rounded-2xl border border-border bg-card p-7 text-center">
          <h1 className="text-2xl font-extrabold">Staff access required</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This area is restricted to authorized Foundation staff.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild variant="default">
              <Link to="/admin-access">Sign in as Administrator</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Return to website</Link>
            </Button>
          </div>
        </div>
      </div>
    );

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}

