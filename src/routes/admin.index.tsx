import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileWarning,
  GraduationCap,
  RotateCcw,
  UserCheck2,
  Users,
  Radio,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { STATUSES } from "@/lib/fsf";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { loadAdminDashboardMetrics, type AdminDashboardMetrics } from "@/lib/supabase/applications";

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });

function AdminDashboard() {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [liveActive, setLiveActive] = useState(true);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMetrics = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const data = await loadAdminDashboardMetrics();
      setMetrics(data);
    } catch (err) {
      console.error("Failed to load dashboard metrics:", err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    // Initial lightning-fast load
    void fetchMetrics();

    // Setup Supabase Realtime live synchronization
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel("admin-dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "applications" },
        () => {
          // Debounce rapid events to execute in ~100ms
          if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
          refreshTimerRef.current = setTimeout(() => {
            void fetchMetrics(false);
          }, 300);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "profiles" },
        () => {
          if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
          refreshTimerRef.current = setTimeout(() => {
            void fetchMetrics(false);
          }, 300);
        }
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          setLiveActive(true);
        }
      });

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      void supabase.removeChannel(channel);
    };
  }, []);

  const totalRegistered = metrics?.totalRegistered ?? 0;
  const totalSubmitted = metrics?.totalSubmitted ?? 0;
  const underReview = metrics?.underReviewCount ?? 0;
  const requireDocs = metrics?.documentsRequiredCount ?? 0;
  const approvedEnrolled = (metrics?.approvedCount ?? 0) + (metrics?.enrolledCount ?? 0);
  const recentList = metrics?.recentSubmissions ?? [];

  const stats = [
    {
      label: "Registered accounts",
      value: totalRegistered,
      icon: Users,
      tone: "text-brand-orange",
      link: "/admin/applicants",
    },
    {
      label: "Submitted applications",
      value: totalSubmitted,
      icon: UserCheck2,
      tone: "text-brand-green",
      link: "/admin/applicants",
    },
    {
      label: "Under review",
      value: underReview,
      icon: Clock3,
      tone: "text-info",
      link: "/admin/applicants",
    },
    {
      label: "Require documents",
      value: requireDocs,
      icon: FileWarning,
      tone: "text-warning",
      link: "/admin/applicants",
    },
    {
      label: "Approved & Enrolled",
      value: approvedEnrolled,
      icon: CheckCircle2,
      tone: "text-brand-green-dark",
      link: "/admin/applicants",
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-brand-orange">Operations overview</p>
            {liveActive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-green-soft/60 px-2 py-0.5 text-[10px] font-bold text-brand-green-dark">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-green animate-pulse" />
                Live Sync
              </span>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Scholarship dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Real-time operations metrics and application pipeline breakdown.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Button
            variant="outline"
            size="default"
            disabled={refreshing}
            onClick={() => void fetchMetrics(true)}
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
            <p className="mt-5 text-3xl font-extrabold">
              {loading ? (
                <span className="inline-block h-8 w-16 animate-pulse rounded bg-muted" />
              ) : (
                stat.value.toLocaleString()
              )}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
          </section>
        ))}
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
        <section className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-5">
            <div>
              <h2 className="font-bold">Recent applications</h2>
              <p className="text-xs text-muted-foreground">Newest submissions and status updates</p>
            </div>
            <Link to="/admin/applicants" className="text-sm font-bold text-brand-green-dark hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-border">
            {loading && recentList.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <span className="inline-block h-4 w-32 animate-pulse rounded bg-muted" />
              </div>
            ) : recentList.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No recent applications found.
              </div>
            ) : (
              recentList.map((app) => (
                <Link
                  key={app.id}
                  to="/admin/applicants/$applicationId"
                  params={{ applicationId: app.id }}
                  className="flex flex-col items-start justify-between gap-3 p-4 hover:bg-secondary/40 sm:flex-row sm:items-center transition-colors"
                >
                  <div>
                    <p className="text-sm font-bold">{app.applicantName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {app.appNumber} · {app.level} {app.programme}
                    </p>
                  </div>
                  <StatusBadge status={app.status} />
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <GraduationCap className="h-5 w-5 text-brand-orange" />
          <h2 className="mt-4 font-bold">Application pipeline</h2>
          <div className="mt-5 space-y-4">
            {STATUSES.filter((status) => status !== "Draft").map((status) => {
              const count = metrics?.byStatus?.[status] ?? 0;
              const total = metrics?.totalSubmitted || 1;
              const percent = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={status}>
                  <div className="flex justify-between gap-3 text-xs">
                    <span>{status}</span>
                    <strong>{count.toLocaleString()}</strong>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                    <span
                      className="block h-full rounded-full bg-brand-green transition-all duration-500"
                      style={{
                        width: `${count > 0 ? Math.max(5, percent) : 0}%`,
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

