import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileWarning,
  GraduationCap,
  RotateCcw,
  UserCheck2,
  Users,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { fullName, STATUSES } from "@/lib/fsf";
import { useStore } from "@/lib/store";
import { loadAdminApplications, loadRegisteredUsers } from "@/lib/supabase/applications";

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });

function AdminDashboard() {
  const { applications, setState } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [registeredCount, setRegisteredCount] = useState<number>(0);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [refreshed, users] = await Promise.all([
        loadAdminApplications(),
        loadRegisteredUsers(),
      ]);
      setState((state) => ({ ...state, applications: refreshed }));
      setRegisteredCount(users.length);
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void handleRefresh();
  }, []);

  const stats = [
    {
      label: "Registered accounts",
      value: registeredCount || applications.length,
      icon: Users,
      tone: "text-brand-orange",
      link: "/admin/applicants",
    },
    {
      label: "Submitted applications",
      value: applications.filter((a) => a.status !== "Draft").length,
      icon: UserCheck2,
      tone: "text-brand-green",
      link: "/admin/applicants",
    },
    {
      label: "Under review",
      value: applications.filter((a) => a.status === "Under Review").length,
      icon: Clock3,
      tone: "text-info",
      link: "/admin/applicants",
    },
    {
      label: "Require documents",
      value: applications.filter((a) => a.status === "Additional Documents Required").length,
      icon: FileWarning,
      tone: "text-warning",
      link: "/admin/applicants",
    },
    {
      label: "Approved & Enrolled",
      value: applications.filter((a) => a.status === "Approved" || a.status === "Enrolled").length,
      icon: CheckCircle2,
      tone: "text-brand-green-dark",
      link: "/admin/applicants",
    },
  ];
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-brand-orange">Operations overview</p>
          <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Scholarship dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            See what needs attention across the active campaign.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Button
            variant="outline"
            size="default"
            disabled={refreshing}
            onClick={() => void handleRefresh()}
          >
            <RotateCcw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <Link to="/admin/applicants">
              Review applications <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <section key={stat.label} className="rounded-2xl border border-border bg-card p-5">
            <stat.icon className={`h-5 w-5 ${stat.tone}`} />
            <p className="mt-5 text-3xl font-extrabold">{stat.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
          </section>
        ))}
      </div>
      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
        <section className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-5">
            <div>
              <h2 className="font-bold">Recent applications</h2>
              <p className="text-xs text-muted-foreground">Newest submissions and changes</p>
            </div>
            <Link to="/admin/applicants" className="text-sm font-bold text-brand-green-dark">
              View all
            </Link>
          </div>
          <div className="divide-y divide-border">
            {applications.slice(0, 6).map((application) => (
              <Link
                key={application.id}
                to="/admin/applicants/$applicationId"
                params={{ applicationId: application.id }}
                className="flex flex-col items-start justify-between gap-3 p-4 hover:bg-secondary/40 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="text-sm font-bold">{fullName(application)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {application.appNumber} · {application.level} {application.programme}
                  </p>
                </div>
                <StatusBadge status={application.status} />
              </Link>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5">
          <GraduationCap className="h-5 w-5 text-brand-orange" />
          <h2 className="mt-4 font-bold">Application pipeline</h2>
          <div className="mt-5 space-y-4">
            {STATUSES.filter((status) => status !== "Draft").map((status) => {
              const count = applications.filter((app) => app.status === status).length;
              return (
                <div key={status}>
                  <div className="flex justify-between gap-3 text-xs">
                    <span>{status}</span>
                    <strong>{count}</strong>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                    <span
                      className="block h-full rounded-full bg-brand-green"
                      style={{
                        width: `${applications.length ? Math.max(5, (count / applications.length) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
