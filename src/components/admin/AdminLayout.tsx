import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
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
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

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
          <button
            className="relative rounded-full border border-border p-2"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-brand-orange" />
          </button>
        </header>
        <main className="p-4 sm:p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
