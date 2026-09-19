import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/login")({
  head: () =>
    seoHead({
      title: "Applicant Login | The Free School Foundation",
      description: "Secure applicant access to The Free School Foundation scholarship portal.",
      path: "/login",
      noIndex: true,
    }),
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "request-reset" | "update-password">("signin");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const { data } = getSupabaseBrowserClient().auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "PASSWORD_RECOVERY") setMode("update-password");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    const supabase = getSupabaseBrowserClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (authError) {
      setLoading(false);
      if (
        authError.status === 429 ||
        authError.message?.toLowerCase().includes("rate limit") ||
        authError.message?.toLowerCase().includes("over_email_send_rate_limit")
      ) {
        setError("Sign-in rate limit reached. Please wait a moment and try again.");
      } else if (authError.message?.toLowerCase().includes("invalid login credentials")) {
        setError("Invalid email or password. Please verify your details or use password reset below.");
      } else if (authError.message?.toLowerCase().includes("email not confirmed")) {
        setError("Your email address is not yet confirmed. Please check your inbox for the confirmation link.");
      } else {
        setError(authError.message || "The email or password is incorrect, or your email has not been confirmed.");
      }
      return;
    }
    const { data: staff } = await supabase
      .from("staff_profiles")
      .select("active")
      .eq("active", true)
      .maybeSingle();

    if (staff?.active) {
      setLoading(false);
      void navigate({ to: "/admin" });
      return;
    }

    if (authData.user) {
      const { data: existingApp } = await supabase
        .from("applications")
        .select("id, status, application_number")
        .eq("applicant_id", authData.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setLoading(false);
      if (existingApp?.application_number && existingApp.status !== "draft") {
        void navigate({ to: "/portal" });
      } else {
        void navigate({ to: "/apply" });
      }
      return;
    }

    setLoading(false);
    void navigate({ to: "/portal" });
  };

  const requestReset = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    const { error: resetError } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/login` },
    );
    setLoading(false);
    if (resetError) {
      setError("We could not send the reset email. Please wait a moment and try again.");
      return;
    }
    setMessage("If that email has an account, a password-reset link is on its way.");
  };

  const updatePassword = async () => {
    if (newPassword.length < 8) {
      setError("Create a password with at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    const { error: updateError } = await getSupabaseBrowserClient().auth.updateUser({
      password: newPassword,
    });
    if (updateError) {
      setLoading(false);
      setError("We could not update your password. Open a new reset link and try again.");
      return;
    }
    await getSupabaseBrowserClient().auth.signOut();
    setLoading(false);
    setMode("signin");
    setMessage("Password updated. Sign in with your new password.");
  };

  return (
    <div className="min-h-screen bg-brand-green-soft/40">
      <header className="border-b border-border bg-background">
        <div className="container-page flex min-h-16 items-center justify-between gap-3">
          <Logo />
          <Link to="/" className="shrink-0 text-xs font-semibold text-brand-green-dark sm:text-sm">
            Back to website
          </Link>
        </div>
      </header>
      <main className="container-page grid min-h-[calc(100vh-65px)] items-center gap-10 py-6 sm:py-10 lg:grid-cols-2">
        <div className="hidden lg:block">
          <p className="text-sm font-bold uppercase tracking-wider text-brand-orange">
            Applicant portal
          </p>
          <h1 className="mt-3 max-w-lg text-4xl font-extrabold">
            Your application updates, all in one place.
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            Track your status, read Foundation messages and provide any additional documents we
            request.
          </p>
          <div className="mt-7 flex max-w-md gap-3 rounded-xl border border-brand-green/20 bg-background p-4">
            <ShieldCheck className="h-6 w-6 shrink-0 text-brand-green" />
            <p className="text-sm text-muted-foreground">
              Sign in with the email and password you created when starting your application.
            </p>
          </div>
        </div>
        <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-lift sm:p-6 md:p-8">
          <LockKeyhole className="h-7 w-7 text-brand-green" />
          <h1 className="mt-5 text-2xl font-extrabold">
            {mode === "signin"
              ? "Applicant login"
              : mode === "request-reset"
                ? "Reset your password"
                : "Create a new password"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Use the email address and password connected to your scholarship application."
              : mode === "request-reset"
                ? "Enter your account email and we will send a secure reset link."
                : "Choose a new password with at least 8 characters."}
          </p>
          {error && (
            <p
              role="alert"
              className="mt-5 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          {message && (
            <p
              role="status"
              className="mt-5 rounded-lg bg-brand-green-soft p-3 text-sm text-brand-green-dark"
            >
              {message}
            </p>
          )}
          {mode === "update-password" ? (
            <form
              className="mt-6 space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                void updatePassword();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  className="h-11"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  className="h-11"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </div>
              <Button size="lg" className="w-full" type="submit" disabled={loading}>
                {loading ? "Updating password…" : "Update password"}
              </Button>
            </form>
          ) : (
            <form
              className="mt-6 space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                void (mode === "signin" ? signIn() : requestReset());
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  className="h-11"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                {mode === "signin" && (
                  <>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      className="h-11"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                  </>
                )}
              </div>
              <Button size="lg" className="w-full" type="submit" disabled={loading}>
                {loading
                  ? mode === "signin"
                    ? "Signing in…"
                    : "Sending reset email…"
                  : mode === "signin"
                    ? "Sign in securely"
                    : "Send reset link"}
                {!loading && mode === "signin" && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>
          )}
          {mode !== "update-password" && (
            <button
              type="button"
              className="mt-4 w-full text-center text-sm font-semibold text-brand-green-dark"
              onClick={() => {
                setError("");
                setMessage("");
                setMode(mode === "signin" ? "request-reset" : "signin");
              }}
            >
              {mode === "signin" ? "Forgot password?" : "Back to sign in"}
            </button>
          )}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Starting a new application?{" "}
            <Link to="/apply" className="font-bold text-brand-green-dark">
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
