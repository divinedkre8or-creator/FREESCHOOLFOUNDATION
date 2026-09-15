import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Award,
  Bell,
  CheckCircle2,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  ScrollText,
  Shield,
  UserCheck,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useCurrentApplication, useStore } from "@/lib/store";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { InstallAppLine } from "@/components/site/InstallAppLine";

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "application", label: "My Application", icon: FileText },
  { id: "documents", label: "Documents", icon: ScrollText },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "announcements", label: "Announcements", icon: Bell },
] as const;

export type PortalSection = (typeof NAV)[number]["id"];

export function PortalLayout({
  active,
  onChange,
  unreadCount,
  children,
}: {
  active: PortalSection;
  onChange: (section: PortalSection) => void;
  unreadCount: number;
  children: ReactNode;
}) {
  const { signOutApplicant } = useStore();
  const application = useCurrentApplication();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-secondary/30 pb-16 lg:pb-12">
      <InstallAppLine />

      {/* Top Government/Foundation Portal Bar */}
      <div className="bg-brand-green-dark px-4 py-1.5 text-xs text-emerald-100 sm:px-6">
        <div className="container-page flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-brand-orange" />
            <span className="font-semibold tracking-wide">
              Official Candidate Admission & Scholarship Portal
            </span>
          </div>
          {application && (
            <span className="hidden font-mono font-bold text-white sm:inline-block">
              {application.appNumber}
            </span>
          )}
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="container-page flex min-h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="hidden rounded-full border border-brand-green/20 bg-brand-green-soft px-2.5 py-0.5 text-[11px] font-bold text-brand-green-dark md:inline-block">
              Candidate Portal
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChange("messages")}
              aria-label={`${unreadCount} unread message${unreadCount === 1 ? "" : "s"}`}
              className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-secondary"
            >
              <Bell className="h-5 w-5 text-foreground" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-brand-orange px-1 text-[10px] font-extrabold leading-none text-white shadow-sm">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
              onClick={async () => {
                await getSupabaseBrowserClient().auth.signOut();
                signOutApplicant();
                void navigate({ to: "/login" });
              }}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>

        {/* Mobile Horizontal Navigation Tabs */}
        <div className="border-t border-border/60 bg-card/60 px-3 py-1.5 lg:hidden">
          <nav
            aria-label="Applicant portal sections"
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1"
          >
            {NAV.map((item) => {
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChange(item.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                    isActive
                      ? "bg-brand-green text-white shadow-sm"
                      : "bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                  {item.id === "messages" && unreadCount > 0 && (
                    <span className="ml-1 rounded-full bg-brand-orange px-1.5 py-0.2 text-[9px] font-extrabold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Portal Layout Content */}
      <div className="container-page grid gap-6 py-5 sm:py-7 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8 lg:py-8">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:block">
          <div className="sticky top-28 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-brand-orange">
                Admission Portal
              </p>
              {application && (
                <div className="mt-2 border-b border-border/70 pb-3">
                  <p className="truncate text-sm font-bold text-foreground">
                    {application.personal.firstName} {application.personal.lastName}
                  </p>
                  <p className="font-mono text-xs font-semibold text-muted-foreground">
                    {application.appNumber}
                  </p>
                </div>
              )}

              <nav aria-label="Applicant desktop navigation" className="mt-3 space-y-1">
                {NAV.map((item) => {
                  const isActive = active === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onChange(item.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-all ${
                        isActive
                          ? "bg-brand-green font-bold text-white shadow-sm"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </span>
                      {item.id === "messages" && unreadCount > 0 && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                            isActive ? "bg-white text-brand-green" : "bg-brand-orange text-white"
                          }`}
                        >
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="rounded-2xl border border-border/80 bg-brand-green-soft/40 p-4 text-xs text-brand-green-dark">
              <div className="flex items-center gap-1.5 font-bold">
                <Shield className="h-4 w-4" /> Official Data Controller
              </div>
              <p className="mt-1 text-muted-foreground">
                The Free School Foundation manages your admissions data securely.
              </p>
              <Link
                to="/"
                className="mt-3 inline-flex items-center gap-1 font-bold text-brand-green-dark hover:underline"
              >
                <Home className="h-3 w-3" /> Return to Website
              </Link>
            </div>
          </div>
        </aside>

        {/* Main Section Content */}
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}

