import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { loadAdminApplications } from "@/lib/supabase/applications";
import { useStore } from "@/lib/store";
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
  const { setState } = useStore();

  useEffect(() => {
    let active = true;
    const fetchApplications = async () => {
      try {
        const applications = await loadAdminApplications();
        if (active) {
          setState((state) => ({ ...state, applications, currentApplicantId: null }));
        }
      } catch (err) {
        console.error("Failed to load admin applications:", err);
      }
    };

    const verify = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        if (active) setAccess("denied");
        return;
      }
      const { data, error } = await supabase
        .from("staff_profiles")
        .select("active")
        .eq("user_id", user.id)
        .eq("active", true)
        .maybeSingle();
      if (!error && data?.active) {
        if (active) setAccess("allowed");
        await fetchApplications();
      } else if (active) {
        setAccess("denied");
      }
    };

    void verify();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchApplications();
      }
    }, 15000);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void fetchApplications();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [setState]);

  if (access === "loading")
    return <div className="grid min-h-screen place-items-center">Checking staff access…</div>;

  if (access === "denied")
    return (
      <div className="grid min-h-screen place-items-center bg-secondary/30 px-4">
        <div className="max-w-md rounded-2xl border border-border bg-card p-7 text-center">
          <h1 className="text-2xl font-extrabold">Staff access required</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This area is restricted to authorized Foundation staff.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Return to website</Link>
          </Button>
        </div>
      </div>
    );

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
