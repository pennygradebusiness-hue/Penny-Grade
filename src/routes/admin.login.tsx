import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { KeyRound, ShieldCheck, CheckCircle2, Lock, ArrowRight, Eye, EyeOff, Loader2, Mail, Sparkles, RefreshCw } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { getSiteUrl } from "@/lib/seo";
import {
  verifyAdminLoginCredentials,
  firstTimeSetPassword,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Admin Login | PennyGrade" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  // Forgot Password / Supabase Auth Recovery Modal State
  const [forgotModal, setForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [botTrap, setBotTrap] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // First-Time Setup Modal State
  const [setupModal, setSetupModal] = useState(false);
  const [setupEmail, setSetupEmail] = useState("");
  const [setupCurrentPass, setSetupCurrentPass] = useState("");
  const [setupNewPass, setSetupNewPass] = useState("");
  const [setupConfirmPass, setSetupConfirmPass] = useState("");
  const [setupBusy, setSetupBusy] = useState(false);

  // Auto-redirect if already authenticated, or handle recovery redirects
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("action") === "forgot" || searchParams.get("forgot") === "true") {
        setForgotModal(true);
      }
      if (searchParams.get("type") === "recovery" || window.location.hash.includes("type=recovery")) {
        navigate({ to: "/admin/reset-password", replace: true });
        return;
      }

      const existing = localStorage.getItem("pennygrade_admin_session");
      if (existing) {
        try {
          const parsed = JSON.parse(existing);
          if (parsed && (parsed.role === "super_admin" || parsed.email)) {
            navigate({ to: "/admin", replace: true });
          }
        } catch {
          // ignore
        }
      }
    }
  }, [navigate]);

  // Persistent anti-abuse rate-limiting keys
  const COOLDOWN_KEY = "pg_recovery_cooldown_expiry";
  const ATTEMPTS_KEY = "pg_recovery_attempts";

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const expiry = parseInt(localStorage.getItem(COOLDOWN_KEY) || "0", 10);
        const remaining = Math.max(0, Math.ceil((expiry - Date.now()) / 1000));
        if (remaining > 0) {
          setCooldown(remaining);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Rate-limiting cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        const next = prev > 0 ? prev - 1 : 0;
        if (next <= 0 && typeof window !== "undefined") {
          try {
            localStorage.removeItem(COOLDOWN_KEY);
          } catch {
            // ignore
          }
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const saveAdminSession = (payload: { id: string; email: string; role: string }) => {
    const raw = JSON.stringify(payload);
    if (typeof window !== "undefined") {
      localStorage.setItem("pennygrade_admin_session", raw);
      document.cookie = `pennygrade_admin_session=${encodeURIComponent(raw)}; path=/; max-age=604800; SameSite=Lax`;
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. Try Supabase Auth
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (!error && data.session) {
          let { data: isAdmin } = await supabase.rpc("is_admin", {
            _user_id: data.user.id,
          });

          if (!isAdmin) {
            const { data: exists } = await supabase.rpc("admin_exists");
            if (!exists) {
              const { data: claimed } = await supabase.rpc("claim_first_admin");
              isAdmin = !!claimed;
            }
          }

          if (isAdmin) {
            saveAdminSession({ id: data.user.id, email: cleanEmail, role: "super_admin" });
            toast.success("Welcome back, Super Admin!");
            setBusy(false);
            navigate({ to: "/admin", replace: true });
            return;
          }
        }
      } catch {
        // Fall through to server-verified store login
      }

      // 2. Verified Admin Store Authentication (handles all invited admins & superadmins)
      const res = await verifyAdminLoginCredentials({
        data: {
          email: cleanEmail,
          password,
        },
      });

      if (res.ok && res.user) {
        saveAdminSession({
          id: res.user.id,
          email: res.user.email,
          role: res.user.role,
        });

        toast.success(`Welcome back, ${res.user.full_name || "Administrator"}!`);
        setBusy(false);
        navigate({ to: "/admin", replace: true });
        return;
      }

      setBusy(false);
      toast.error(res.message || "Incorrect email or password.");
    } catch {
      setBusy(false);
      toast.error("Unable to authenticate. Please check your credentials.");
    }
  };

  const handleFirstTimeSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupEmail.trim()) return toast.error("Please enter your admin email");
    if (setupNewPass.length < 6) return toast.error("Password must be at least 6 characters");
    if (setupNewPass !== setupConfirmPass) return toast.error("Passwords do not match");

    setSetupBusy(true);
    try {
      const res = await firstTimeSetPassword({
        data: {
          email: setupEmail.trim().toLowerCase(),
          new_password: setupNewPass,
          current_temporary_password: setupCurrentPass.trim() || undefined,
        },
      });

      toast.success(res.message || "Password updated successfully!");
      setEmail(setupEmail.trim().toLowerCase());
      setPassword(setupNewPass);
      setSetupModal(false);
      setSetupEmail("");
      setSetupCurrentPass("");
      setSetupNewPass("");
      setSetupConfirmPass("");
    } catch (err) {
      toast.error((err as Error).message || "Failed to update password");
    } finally {
      setSetupBusy(false);
    }
  };

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Silent Bot Honeypot Trap
    // Automated scrapers and bots will fill this hidden field. We silently trap them without hitting Supabase.
    if (botTrap.trim()) {
      setForgotSent(true);
      return;
    }

    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail) {
      toast.error("Please enter your administrator email address.");
      return;
    }

    // 2. Strict RFC email format verification before touching backend
    const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!EMAIL_REGEX.test(cleanEmail)) {
      toast.error("Please enter a valid administrator email address.");
      return;
    }

    if (cooldown > 0) {
      toast.warning(`Please wait ${cooldown}s before requesting another reset email.`);
      return;
    }

    // 3. Client sliding-window abuse limiter (Maximum 4 requests per 15 minutes)
    if (typeof window !== "undefined") {
      try {
        const now = Date.now();
        const rawAttempts = localStorage.getItem(ATTEMPTS_KEY);
        let attempts: number[] = rawAttempts ? JSON.parse(rawAttempts) : [];
        attempts = attempts.filter((t) => now - t < 15 * 60 * 1000);
        if (attempts.length >= 4) {
          toast.error("Security alert: Excessive recovery attempts detected. Please wait 15 minutes.");
          setCooldown(900);
          localStorage.setItem(COOLDOWN_KEY, (now + 900_000).toString());
          return;
        }
        attempts.push(now);
        localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
      } catch {
        // ignore
      }
    }

    setForgotBusy(true);

    try {
      const origin =
        typeof window !== "undefined" && window.location.origin && !window.location.origin.includes("0.0.0.0")
          ? window.location.origin
          : getSiteUrl();
      const redirectUrl = `${origin}/admin/reset-password`;

      // Call Supabase Auth supported password recovery API
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });

      if (error && (error as { status?: number }).status === 429) {
        toast.error("Too many reset requests. Please wait a few minutes before trying again.");
        setForgotBusy(false);
        setCooldown(180);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(COOLDOWN_KEY, (Date.now() + 180_000).toString());
          } catch {}
        }
        return;
      }

      // Always display generic confirmation message (prevents user account enumeration)
      setForgotSent(true);
      setCooldown(60); // 60-second abuse prevention cooldown
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(COOLDOWN_KEY, (Date.now() + 60_000).toString());
        } catch {}
      }
      toast.success("Password recovery request received.");
    } catch {
      // In case of any unhandled network error, show generic confirmation as per security requirements
      setForgotSent(true);
      setCooldown(60);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(COOLDOWN_KEY, (Date.now() + 60_000).toString());
        } catch {}
      }
    } finally {
      setForgotBusy(false);
    }
  };

  return (
    <AuthShell
      title="Administrator Sign In"
      subtitle="PennyGrade operations & management console"
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="admin-email" className="text-xs font-bold text-navy uppercase tracking-wider">
            Admin Email
          </Label>
          <Input
            id="admin-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-[9px] border-[#ececf1] text-xs font-semibold shadow-sm focus:border-gold"
            placeholder="name@pennygrade.in"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="admin-password" className="text-xs font-bold text-navy uppercase tracking-wider">
              Password
            </Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email.trim() || "");
                  setForgotModal(true);
                }}
                className="text-[11px] font-bold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
              <span className="text-slate-300 text-xs">·</span>
              <button
                type="button"
                onClick={() => {
                  setSetupEmail(email);
                  setSetupModal(true);
                }}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                First-Time Setup
              </button>
            </div>
          </div>
          <div className="relative">
            <Input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-[9px] border-[#ececf1] text-xs font-semibold shadow-sm focus:border-gold pr-10"
              placeholder="••••••••••••"
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

        <Button
          className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 font-display text-xs font-extrabold text-white shadow-md shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer"
          size="lg"
          disabled={busy}
        >
          {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {busy ? "Signing in…" : "Sign In to Admin Console"}
        </Button>
        <p className="text-center text-[10px] font-semibold text-muted-foreground">
          Protected area. Authorized PennyGrade personnel only.
        </p>
      </form>

      {/* Forgot Password / Supabase Auth Password Recovery Dialog */}
      <Dialog open={forgotModal} onOpenChange={setForgotModal}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border border-amber-500/20 shadow-2xl bg-white">
          {/* Top Decorative Header */}
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-black p-6 text-white border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/25 ring-1 ring-amber-300">
                <KeyRound className="h-6 w-6 stroke-[2.5]" />
              </div>
              <DialogHeader className="text-left space-y-0.5">
                <DialogTitle className="font-display text-base font-extrabold text-white">
                  Reset Admin Password
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Secure email-based recovery via Supabase Auth
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          <div className="p-6 pt-5">
            {forgotSent ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/70 p-4 text-emerald-950 space-y-2">
                  <div className="flex items-center gap-2 font-extrabold text-emerald-900">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span>Password Reset Request Received</span>
                  </div>
                  <p className="text-xs leading-relaxed text-emerald-800 font-medium">
                    If an account exists for this email address, you will receive a password reset link shortly.
                  </p>
                  <p className="text-[11px] text-emerald-700/80">
                    Please check your inbox and spam folder. The secure reset link expires in 60 minutes.
                  </p>
                </div>

                {cooldown > 0 && (
                  <p className="text-center text-[11px] font-semibold text-slate-500">
                    Resend link available in <span className="font-mono font-bold text-amber-600">{cooldown}s</span>
                  </p>
                )}

                <div className="flex gap-2.5 pt-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setForgotModal(false);
                      setForgotSent(false);
                    }}
                    className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-xs font-extrabold text-white shadow-md shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer"
                  >
                    Done & Return to Sign In
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={cooldown > 0}
                    onClick={() => setForgotSent(false)}
                    className="rounded-xl text-xs font-bold border-slate-200"
                  >
                    Send Again
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRequestPasswordReset} className="space-y-4">
                {/* Honeypot field for anti-bot defense */}
                <div className="sr-only" aria-hidden="true" style={{ position: "absolute", left: "-9999px" }}>
                  <label htmlFor="pg_security_trap">Leave this blank</label>
                  <input
                    id="pg_security_trap"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={botTrap}
                    onChange={(e) => setBotTrap(e.target.value)}
                  />
                </div>

                <div className="rounded-xl border border-slate-200/90 bg-slate-50 p-3.5 text-xs text-slate-600 space-y-1.5 leading-relaxed">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <ShieldCheck className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>Cryptographically Signed Link</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Enter your registered administrator email address below. We'll send you a single-use recovery link to securely establish a new password.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email" className="text-xs font-bold text-navy uppercase tracking-wider">
                    Registered Admin Email
                  </Label>
                  <div className="relative">
                    <Input
                      id="forgot-email"
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Enter registered administrator email"
                      className="h-11 rounded-[9px] border-[#ececf1] text-xs font-semibold shadow-sm focus:border-gold pl-9"
                    />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <Button
                    type="submit"
                    disabled={forgotBusy || cooldown > 0}
                    className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-xs font-extrabold text-white shadow-md shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {forgotBusy ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Dispatching Link…
                      </>
                    ) : cooldown > 0 ? (
                      `Please wait (${cooldown}s)`
                    ) : (
                      <>
                        Send Password Reset Link
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl text-xs font-bold border-slate-200"
                    onClick={() => setForgotModal(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* First-Time Setup / Password Reset Dialog */}
      <Dialog open={setupModal} onOpenChange={setSetupModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-navy flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-500" />
              First-Time Login / Set Password
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              If an administrator has granted you access, set your permanent password below.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFirstTimeSetup} className="space-y-3.5 pt-1">
            <p className="text-xs text-slate-600">
              If an administrator has granted you access, set your permanent password below to sign in:
            </p>

            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">Admin Email Address</Label>
              <Input
                type="email"
                required
                value={setupEmail}
                onChange={(e) => setSetupEmail(e.target.value)}
                placeholder="your.email@pennygrade.in"
                className="h-10 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">
                Temporary Password <span className="text-muted-foreground font-normal">(provided by Super Admin)</span>
              </Label>
              <Input
                type="password"
                value={setupCurrentPass}
                onChange={(e) => setSetupCurrentPass(e.target.value)}
                placeholder="e.g. Penny@8X3W!"
                className="h-10 text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">New Password</Label>
                <Input
                  type="password"
                  required
                  value={setupNewPass}
                  onChange={(e) => setSetupNewPass(e.target.value)}
                  placeholder="Min. 6 chars"
                  className="h-10 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">Confirm Password</Label>
                <Input
                  type="password"
                  required
                  value={setupConfirmPass}
                  onChange={(e) => setSetupConfirmPass(e.target.value)}
                  placeholder="Confirm new pass"
                  className="h-10 text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <Button
                type="submit"
                disabled={setupBusy}
                className="flex-1 rounded-xl bg-navy text-xs font-extrabold text-white hover:bg-navy-deep cursor-pointer"
              >
                {setupBusy ? "Updating…" : "Set Password & Proceed"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl text-xs font-bold"
                onClick={() => setSetupModal(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AuthShell>
  );
}
