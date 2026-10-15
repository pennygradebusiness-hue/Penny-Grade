import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Mail,
  Check,
} from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Administrator Password | PennyGrade" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminResetPasswordPage,
});

function AdminResetPasswordPage() {
  const navigate = useNavigate();

  // Status transitions: "validating" -> "ready" | "invalid_token" -> "success"
  const [status, setStatus] = useState<"validating" | "ready" | "invalid_token" | "success">("validating");
  const [errorMessage, setErrorMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");

  // Form field states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    let mounted = true;

    async function evaluateRecoverySession() {
      if (typeof window === "undefined") return;

      // 1. Inspect URL hash for Supabase Auth error redirects
      // e.g. #error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired
      const hash = window.location.hash || "";
      if (hash.includes("error=")) {
        const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
        const desc = hashParams.get("error_description") || "The password reset link is invalid, malformed, or has expired.";
        if (mounted) {
          setErrorMessage(desc.replace(/\+/g, " "));
          setStatus("invalid_token");
        }
        return;
      }

      // 2. Handle PKCE code exchange if ?code=... is present in search parameters
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");
      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            if (mounted) {
              setErrorMessage("The recovery code could not be verified or has expired.");
              setStatus("invalid_token");
            }
            return;
          }
          if (data.session && mounted) {
            setUserEmail(data.session.user.email || "");
            setStatus("ready");
            return;
          }
        } catch {
          if (mounted) {
            setErrorMessage("Failed to verify authentication code.");
            setStatus("invalid_token");
          }
          return;
        }
      }

      // 3. Direct hash extraction for implicit recovery flow (#access_token=...&refresh_token=...)
      if (hash.includes("access_token=")) {
        try {
          const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          if (accessToken && refreshToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (!error && data.session && mounted) {
              setUserEmail(data.session.user.email || "");
              setStatus("ready");
              return;
            }
          }
        } catch {
          // Fall through to getSession / listener
        }
      }

      // 4. Check for existing active recovery session in Supabase client
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session && mounted) {
          setUserEmail(data.session.user.email || "");
          setStatus("ready");
          return;
        }
      } catch {
        // Fall through to listener
      }

      // 4. Timeout fallback: if no recovery session or event is detected within 2500ms
      const timeout = setTimeout(() => {
        if (mounted && status === "validating") {
          setStatus("invalid_token");
          setErrorMessage(
            "No active password recovery session detected. Password reset links are valid for one-time use only."
          );
        }
      }, 2500);

      return () => clearTimeout(timeout);
    }

    // Subscribe to auth state changes to detect PASSWORD_RECOVERY event
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        if (session?.user?.email) {
          setUserEmail(session.user.email);
        }
        setStatus("ready");
      }
    });

    evaluateRecoverySession();

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Countdown timer for automatic redirect upon successful reset
  useEffect(() => {
    if (status !== "success") return;
    if (countdown <= 0) {
      navigate({ to: "/admin/login", replace: true });
      return;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [status, countdown, navigate]);

  // Real-time password requirement evaluations
  const hasMinLength = newPassword.length >= 8;
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = hasMinLength && hasNumberOrSymbol && passwordsMatch;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasMinLength) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    if (!hasNumberOrSymbol) {
      toast.error("Password must contain at least one number or special character.");
      return;
    }
    if (!passwordsMatch) {
      toast.error("Passwords do not match. Please re-enter.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Update password via Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast.error(error.message || "Failed to update password. Please request a new recovery link.");
        setIsSubmitting(false);
        return;
      }

      // Clear the temporary recovery session cleanly.
      try {
        await supabase.auth.signOut();
        if (typeof window !== "undefined") {
          localStorage.removeItem("pennygrade_admin_session");
        }
      } catch {
        // ignore signout errors
      }

      toast.success("Password updated successfully!");
      setStatus("success");
    } catch (err) {
      toast.error((err as Error).message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Create New Password"
      subtitle="Establish a new secure password for your administrator account"
    >
      {/* 1. VALIDATING SESSION STATE */}
      {status === "validating" && (
        <div className="py-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
          <h2 className="text-base font-extrabold text-navy font-display">
            Verifying Recovery Link…
          </h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            Validating your cryptographic recovery session with Supabase Auth. Please wait a moment.
          </p>
        </div>
      )}

      {/* 2. INVALID / EXPIRED LINK STATE */}
      {status === "invalid_token" && (
        <div className="space-y-5 text-center py-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-navy font-display">
              Invalid or Expired Link
            </h2>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              {errorMessage ||
                "This password recovery link is invalid, has expired, or was already used. For security, recovery links can only be used once."}
            </p>
          </div>

          <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-3.5 text-left text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Need a New Password Reset Link?</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              You can request a fresh recovery link anytime using your registered administrator email.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <Button
              asChild
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 font-display text-xs font-extrabold text-white shadow-md shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer"
            >
              <Link to="/admin/login" search={{ action: "forgot" }}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Request New Reset Link
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-100"
            >
              <Link to="/admin/login">Return to Sign In</Link>
            </Button>
          </div>
        </div>
      )}

      {/* 3. SUCCESSFUL RESET STATE */}
      {status === "success" && (
        <div className="space-y-5 text-center py-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 font-display">
              Password Reset Complete!
            </h2>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
              Your administrator password has been updated securely. You can now access the PennyGrade console with your new credentials.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            Redirecting to Admin Sign In in <strong className="text-slate-900 font-bold">{countdown}s</strong>…
          </div>
          <Button
            asChild
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 font-display text-xs font-extrabold text-white shadow-md shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer"
          >
            <Link to="/admin/login">
              Proceed to Sign In <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      )}

      {/* 4. READY STATE: NEW PASSWORD FORM */}
      {status === "ready" && (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {userEmail && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs">
              <span className="font-semibold text-slate-500">Account:</span>
              <span className="font-bold text-slate-900 font-mono truncate max-w-[220px]">
                {userEmail}
              </span>
            </div>
          )}

          {/* New Password */}
          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-xs font-bold text-navy uppercase tracking-wider">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter strong password (min. 8 characters)"
                className="h-11 rounded-[9px] border-[#ececf1] text-xs font-semibold shadow-sm focus:border-gold pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className="text-xs font-bold text-navy uppercase tracking-wider">
              Confirm New Password
            </Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="h-11 rounded-[9px] border-[#ececf1] text-xs font-semibold shadow-sm focus:border-gold pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                tabIndex={-1}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Password Requirements Checklist */}
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3.5 space-y-2 text-[11px]">
            <p className="font-bold text-slate-700">Password Policy Requirements:</p>
            <div className="space-y-1.5">
              <div
                className={`flex items-center gap-1.5 ${
                  hasMinLength ? "text-emerald-700 font-semibold" : "text-slate-500"
                }`}
              >
                {hasMinLength ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[2.5]" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300 ml-1 mr-1" />
                )}
                <span>At least 8 characters in length</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  hasNumberOrSymbol ? "text-emerald-700 font-semibold" : "text-slate-500"
                }`}
              >
                {hasNumberOrSymbol ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[2.5]" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300 ml-1 mr-1" />
                )}
                <span>Contains at least one number or special symbol</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  passwordsMatch ? "text-emerald-700 font-semibold" : "text-slate-500"
                }`}
              >
                {passwordsMatch ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[2.5]" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300 ml-1 mr-1" />
                )}
                <span>Both passwords match</span>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 font-display text-xs font-extrabold text-white shadow-md shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer disabled:opacity-50"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Updating Administrator Password…
              </>
            ) : (
              "Set New Password & Proceed"
            )}
          </Button>

          <div className="text-center pt-1">
            <Link
              to="/admin/login"
              className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              Cancel and Return to Sign In
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
