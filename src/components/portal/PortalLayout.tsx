import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, FileText, LayoutDashboard, LogOut, MessageSquare, ScrollText } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { InstallAppLine } from "@/components/site/InstallAppLine";

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "application", label: "My application", icon: FileText },
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
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-secondary/30">
      <InstallAppLine />
      <header className="border-b border-border bg-background">
        <div className="container-page flex min-h-16 items-center justify-between gap-2">
          <Logo />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onChange("messages")}
              aria-label={`${unreadCount} unread message${unreadCount === 1 ? "" : "s"}`}
              className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-secondary"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 px-2 sm:px-3"
              onClick={async () => {
                await getSupabaseBrowserClient().auth.signOut();
                signOutApplicant();
                void navigate({ to: "/login" });
              }}
            >
              <LogOut className="h-4 w-4 sm:mr-2" />{" "}
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>
      <div className="container-page grid gap-5 py-5 sm:gap-6 sm:py-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:py-10">
        <aside>
          <nav
            aria-label="Applicant portal"
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-col"
          >
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
                className={`flex min-h-12 min-w-0 items-center gap-2 rounded-lg px-3 text-left text-xs font-semibold transition-colors sm:text-sm lg:min-h-11 lg:gap-3 ${
                  active === item.id
                    ? "bg-brand-green text-white"
                    : "bg-background text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" /> {item.label}
                {item.id === "messages" && unreadCount > 0 && (
                  <span className="ml-auto rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <Link to="/" className="mt-5 hidden text-sm font-semibold text-brand-green-dark lg:block">
            Return to website
          </Link>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
