import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, ShieldCheck, CheckCircle2, Lock, ArrowRight } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { verifyAdminLoginCredentials, firstTimeSetPassword } from "@/lib/admin.functions";

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
  const [email, setEmail] = useState("admin@pennygrade.com");
  const [password, setPassword] = useState("admin123");
  const [busy, setBusy] = useState(false);

  // First-Time Setup Modal State
  const [setupModal, setSetupModal] = useState(false);
  const [setupEmail, setSetupEmail] = useState("");
  const [setupCurrentPass, setSetupCurrentPass] = useState("");
  const [setupNewPass, setSetupNewPass] = useState("");
  const [setupConfirmPass, setSetupConfirmPass] = useState("");
  const [setupBusy, setSetupBusy] = useState(false);

  // Auto-redirect if already authenticated
  useState(() => {
    if (typeof window !== "undefined") {
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
  });

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
            placeholder="admin@pennygrade.com"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="admin-password" className="text-xs font-bold text-navy uppercase tracking-wider">
              Password
            </Label>
            <button
              type="button"
              onClick={() => {
                setSetupEmail(email);
                setSetupModal(true);
              }}
              className="text-[11px] font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
            >
              First-Time Login / Set Password?
            </button>
          </div>
          <Input
            id="admin-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-[9px] border-[#ececf1] text-xs font-semibold shadow-sm focus:border-gold"
            placeholder="••••••••••••"
          />
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-extrabold text-slate-900">
              <KeyRound className="h-3.5 w-3.5 text-amber-500" /> Default Root Admin:
            </div>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded">
              Super Admin
            </span>
          </div>
          <p className="mt-1 font-mono text-[11px] text-slate-600">
            Email: <span className="font-bold text-slate-900">admin@pennygrade.com</span> · Pass: <span className="font-bold text-slate-900">admin123</span>
          </p>
          <p className="mt-1 text-[10px] text-slate-500">
            Invited team members: Sign in with the temporary password generated by your Super Admin.
          </p>
        </div>

        <Button
          className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 font-display text-xs font-extrabold text-white shadow-md shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer"
          size="lg"
          disabled={busy}
        >
          {busy ? "Signing in…" : "Sign In to Admin Console"}
        </Button>
        <p className="text-center text-[10px] font-semibold text-muted-foreground">
          Protected area. Authorized PennyGrade personnel only.
        </p>
      </form>

      {/* First-Time Setup / Password Reset Dialog */}
      <Dialog open={setupModal} onOpenChange={setSetupModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-navy flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-500" />
              First-Time Login / Set Password
            </DialogTitle>
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
                placeholder="your.email@pennygrade.com"
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
