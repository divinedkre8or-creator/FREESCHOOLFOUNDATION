import { useEffect } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function StandaloneAppLauncher() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

    // Only perform automatic portal launcher redirection if opening the standalone app at root "/"
    if (!isStandalone || location.pathname !== "/") return;

    let active = true;

    const routeStandalonePortal = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        if (!active) return;

        if (data.session?.user) {
          const isSuperAdminEmail =
            data.session.user.email === "officialnwachukwudivine@gmail.com" ||
            data.session.user.email?.endsWith("@thefreeschoolfoundation.com.ng");

          // Check if staff profile exists
          const { data: staffData } = await supabase
            .from("staff_profiles")
            .select("role, active")
            .eq("user_id", data.session.user.id)
            .eq("active", true)
            .maybeSingle();

          if (!active) return;

          if ((staffData && staffData.active) || isSuperAdminEmail) {
            // Admin portal
            void navigate({ to: "/admin" });
          } else {
            // Applicant admission portal
            void navigate({ to: "/portal" });
          }
        } else {
          // Not signed in on standalone app launch -> direct to login
          void navigate({ to: "/login" });
        }
      } catch {
        // Fallback: stay on current route
      }
    };

    void routeStandalonePortal();

    return () => {
      active = false;
    };
  }, [location.pathname, navigate]);

  return null;
}
