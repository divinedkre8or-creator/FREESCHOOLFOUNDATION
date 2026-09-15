import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  CheckCheck,
  Clock,
  FileCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useStore } from "@/lib/store";
import { InstallAppLine } from "@/components/site/InstallAppLine";
import { formatDateTime } from "@/lib/fsf";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/applicants", label: "Applicants", icon: Users },
  { to: "/admin/communications", label: "Communications", icon: MessageSquare },
  { to: "/admin/campaigns", label: "Campaigns", icon: GraduationCap },
  { to: "/admin/staff", label: "Staff & access", icon: ShieldCheck },
] as const;

export function AdminLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { applications } = useStore();
  const [readNotifications, setReadNotifications] = useState<Record<string, boolean>>({});
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Generate dynamic notification items from application state
  const notifications = applications.slice(0, 15).map((app) => ({
    id: app.id,
    title: `${app.personal.firstName} ${app.personal.lastName}`,
    description: `Applied for ${app.level} in ${app.programme}`,
    status: app.status,
    time: app.submittedAt || app.createdAt,
    appNumber: app.appNumber,
    isUnread: !readNotifications[app.id] && (app.status === "Submitted" || app.status === "Under Review"),
  }));

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  const markAllAsRead = () => {
    const updated: Record<string, boolean> = {};
    notifications.forEach((n) => {
      updated[n.id] = true;
    });
    setReadNotifications((prev) => ({ ...prev, ...updated }));
  };

  const handleNotificationClick = (appId: string) => {
    setReadNotifications((prev) => ({ ...prev, [appId]: true }));
    setPopoverOpen(false);
    void navigate({ to: `/admin/applicants` });
  };

  return (
    <div className="min-h-screen bg-secondary/30 lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] border-r border-border bg-background p-5 transition-transform lg:static lg:w-auto lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between">
          <Logo />
          <button
            className="p-2 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-8 px-3 text-xs font-bold uppercase tracking-wider text-brand-orange">
          Scholarship panel
        </p>
        <nav className="mt-3 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/admin" }}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-brand-green-soft text-brand-green-dark" }}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 border-t border-border pt-5">
          <p className="px-3 text-sm font-bold">Authorized staff</p>
          <p className="px-3 text-xs text-muted-foreground">Foundation administration</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 w-full justify-start"
            onClick={async () => {
              await getSupabaseBrowserClient().auth.signOut();
              void navigate({ to: "/" });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
      {open && (
        <button
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close navigation overlay"
        />
      )}
      <div className="min-w-0">
        <InstallAppLine />
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur sm:px-5 md:px-8">
          <button
            className="rounded-md border border-border p-2 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden lg:block">
            <p className="text-sm font-bold">Scholarship dashboard</p>
            <p className="text-xs text-muted-foreground">Citi Polytechnic ODeL 2026</p>
          </div>
          
          {/* Functional Notifications Center */}
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                className="relative grid h-10 w-10 place-items-center rounded-full border border-border bg-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-brand-green"
                aria-label={`Notifications (${unreadCount} unread)`}
              >
                <Bell className="h-5 w-5 text-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-orange px-1 text-[10px] font-bold text-white shadow-sm">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 shadow-xl sm:w-96">
              <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-secondary/20">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-brand-orange-soft px-2 py-0.5 text-xs font-bold text-brand-orange">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-xs font-semibold text-brand-green-dark hover:underline"
                  >
                    <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-[340px] overflow-y-auto divide-y divide-border/60">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    <FileText className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                    No notifications yet. New applications will appear here.
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item.id)}
                      className={`flex cursor-pointer gap-3 p-3.5 transition-colors hover:bg-secondary/50 ${
                        item.isUnread ? "bg-brand-green-soft/30 font-medium" : ""
                      }`}
                    >
                      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-green-soft text-brand-green-dark">
                        {item.status === "Approved" ? (
                          <FileCheck className="h-4 w-4" />
                        ) : (
                          <Users className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="truncate text-xs font-bold text-foreground">
                            {item.title}
                          </p>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {formatDateTime(item.time)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {item.description}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                            {item.appNumber}
                          </span>
                          <span className="text-[10px] text-brand-green-dark font-semibold">
                            {item.status}
                          </span>
                        </div>
                      </div>
                      {item.isUnread && (
                        <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-orange" />
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-border p-2 bg-secondary/10 text-center">
                <Link
                  to="/admin/applicants"
                  onClick={() => setPopoverOpen(false)}
                  className="block rounded-md py-1.5 text-xs font-bold text-brand-green-dark hover:bg-secondary"
                >
                  View all applicants →
                </Link>
              </div>
            </PopoverContent>
          </Popover>
        </header>
        <main className="p-4 sm:p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
