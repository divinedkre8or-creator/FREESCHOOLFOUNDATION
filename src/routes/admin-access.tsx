import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/admin-access")({
  head: () =>
    seoHead({
      title: "Scholarship Panel Access | The Free School Foundation",
      description: "Restricted administrator access for the Foundation scholarship panel.",
      path: "/admin-access",
      noIndex: true,
    }),
  component: AdminAccessPage,
});

function AdminAccessPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const openPanelIfAuthorized = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;
      const { data: staff } = await supabase
        .from("staff_profiles")
        .select("active")
        .eq("active", true)
        .maybeSingle();
      if (staff?.active) void navigate({ to: "/admin" });
    };
    void openPanelIfAuthorized();
  }, [navigate]);

  const submit = async () => {
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    const supabase = getSupabaseBrowserClient();
    const normalizedEmail = email.trim().toLowerCase();

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { emailRedirectTo: `${window.location.origin}/admin-access` },
      });
      setLoading(false);
      if (signUpError) {
        setError("The account could not be created. Check the email and try again.");
        return;
      }
      if (!data.session) {
        setMessage("Confirm the email we sent you, then return here and sign in.");
        setMode("signin");
        return;
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (signInError) {
        setLoading(false);
        setError("The email or password is incorrect, or the email has not been confirmed.");
        return;
      }
    }

    const { data: staff } = await supabase
      .from("staff_profiles")
      .select("active")
      .eq("active", true)
      .maybeSingle();
    setLoading(false);
    if (!staff?.active) {
      await supabase.auth.signOut();
      setError("This account does not have scholarship-panel access.");
      return;
    }
    void navigate({ to: "/admin" });
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b border-border bg-background">
        <div className="container-page flex min-h-16 items-center justify-between gap-3">
          <Logo />
          <Link to="/" className="text-xs font-semibold text-brand-green-dark sm:text-sm">
            Back to website
          </Link>
        </div>
      </header>
      <main className="container-page grid min-h-[calc(100vh-65px)] place-items-center py-7">
        <section className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-lift sm:p-8">
          <LockKeyhole className="h-7 w-7 text-brand-green" />
          <p className="mt-5 text-sm font-bold uppercase tracking-wider text-brand-orange">
            Scholarship panel
          </p>
          <h1 className="mt-2 text-2xl font-extrabold">
            {mode === "signin" ? "Administrator sign in" : "Create administrator account"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Only an email approved by the Foundation can receive administrator access.
          </p>
          {error && (
            <p className="mt-5 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          {message && (
            <p className="mt-5 rounded-lg bg-brand-green-soft p-3 text-sm text-brand-green-dark">
              {message}
            </p>
          )}
          <form
            className="mt-6 space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email address</Label>
              <Input
                id="admin-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="admin-confirm-password">Confirm password</Label>
                <Input
                  id="admin-confirm-password"
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </div>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading
                ? "Checking access…"
                : mode === "signin"
                  ? "Open scholarship panel"
                  : "Create secure account"}
            </Button>
          </form>
          <button
            type="button"
            className="mt-5 w-full text-center text-sm font-semibold text-brand-green-dark"
            onClick={() => {
              setError("");
              setMessage("");
              setMode(mode === "signin" ? "signup" : "signin");
            }}
          >
            {mode === "signin"
              ? "First administrator? Create account"
              : "Already registered? Sign in"}
          </button>
          <div className="mt-5 flex gap-3 rounded-lg bg-brand-green-soft p-4 text-sm text-brand-green-dark">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            Access is checked against the Foundation's server-side staff register.
          </div>
        </section>
      </main>
    </div>
  );
}
