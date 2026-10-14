import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { PageHeader, DataTable, td, TableSkeleton, Select, Stat, Panel } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getAdminUsers, addAdmin, removeAdminRole, resetAdminPassword } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { type V1AdminUser } from "@/lib/v1-store";
import { getSiteUrl } from "@/lib/seo";
import {
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  KeyRound,
  UserPlus,
  Trash2,
  CheckCircle2,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Share2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/admins")({ component: Admins });

const ROLES = ["super_admin", "manager", "membership_manager", "support"] as const;

type RoleType = (typeof ROLES)[number];

const ROLE_CONFIG: Record<
  RoleType,
  {
    title: string;
    badgeClass: string;
    permissions: string[];
    description: string;
  }
> = {
  super_admin: {
    title: "Super Admin",
    badgeClass: "bg-purple-100 text-purple-900 border-purple-200 ring-1 ring-purple-300/50",
    permissions: ["Full System Control", "Role Delegation", "Financial Reports", "Audit Logs", "Partner Approvals"],
    description: "Unrestricted access across all PennyGrade admin modules and settings.",
  },
  manager: {
    title: "Operations Manager",
    badgeClass: "bg-blue-100 text-blue-900 border-blue-200 ring-1 ring-blue-300/50",
    permissions: ["Partner Outlets", "Offer Management", "Categories", "Verification Review"],
    description: "Day-to-day business operations, partner approval, and live offer configuration.",
  },
  membership_manager: {
    title: "Membership Manager",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-200 ring-1 ring-amber-300/50",
    permissions: ["Member Records", "Physical Cards", "Batch Generation", "Membership Renewals"],
    description: "Issuing physical cards, batch card generation, and managing member subscriptions.",
  },
  support: {
    title: "Support Agent",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-200 ring-1 ring-slate-300/50",
    permissions: ["Customer Verification Lookup", "Read-Only Outlets", "Savings History Inquiry"],
    description: "Customer service inquiries and read-only lookup of cards and verifications.",
  },
};

function generateSecurePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let randomPart = "";
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `Penny@${randomPart}!`;
}

function Admins() {
  const { roles } = Route.useRouteContext();
  const isSuper = roles.includes("super_admin");
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["admin", "admin-users"],
    queryFn: async () => {
      return await getAdminUsers();
    },
  });

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<RoleType>("manager");
  const [password, setPassword] = useState(() => generateSecurePassword());
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Modal states for created credentials
  const [createdCreds, setCreatedCreds] = useState<{
    name: string;
    email: string;
    role: RoleType;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset password state for existing admin
  const [resettingUser, setResettingUser] = useState<V1AdminUser | null>(null);
  const [newResetPassword, setNewResetPassword] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  const adminList = q.data ?? [];

  // Role Counts
  const counts = useMemo(() => {
    const res = {
      total: adminList.length,
      super_admin: 0,
      manager: 0,
      membership_manager: 0,
      support: 0,
    };
    adminList.forEach((a) => {
      if (a.role in res) {
        res[a.role as RoleType]++;
      }
    });
    return res;
  }, [adminList]);

  const grant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("Please enter a valid email");
    setSubmitting(true);
    try {
      const res = await addAdmin({
        data: {
          email: email.trim().toLowerCase(),
          role,
          full_name: name.trim() || undefined,
          temporary_password: password.trim() || undefined,
        },
      });
      toast.success(res.message || "Administrator role granted");
      
      const issuedPass = res.temporary_password || password;
      setCreatedCreds({
        name: name.trim() || res.admin.full_name || email.split("@")[0],
        email: email.trim().toLowerCase(),
        role,
        password: issuedPass,
      });

      setEmail("");
      setName("");
      setPassword(generateSecurePassword());
      qc.invalidateQueries({ queryKey: ["admin", "admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resettingUser) return;
    setResetBusy(true);
    try {
      const res = await resetAdminPassword({
        data: {
          id: resettingUser.id,
          new_password: newResetPassword.trim() || undefined,
        },
      });
      toast.success(`Password reset for ${res.email}`);
      setCreatedCreds({
        name: resettingUser.full_name || resettingUser.email,
        email: resettingUser.email,
        role: resettingUser.role,
        password: res.temporary_password,
      });
      setResettingUser(null);
      setNewResetPassword("");
      qc.invalidateQueries({ queryKey: ["admin", "admin-users"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setResetBusy(false);
    }
  };

  const copyCredentials = (data: { name: string; email: string; role: RoleType; password: string }) => {
    const origin = typeof window !== "undefined" && window.location?.origin ? window.location.origin : getSiteUrl();
    const text = `🎉 PennyGrade Administrator Access
------------------------------------------------
Name: ${data.name}
Email: ${data.email}
Assigned Role: ${ROLE_CONFIG[data.role].title}
Initial Password: ${data.password}

Sign In Portal:
${origin}/admin/login
------------------------------------------------
Please sign in and change your password upon first login.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Credentials copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const revoke = async (id: string, adminEmail: string, roleName: string) => {
    if (!confirm(`Are you sure you want to remove ${roleName.replace(/_/g, " ")} role from ${adminEmail}?`)) return;
    try {
      await removeAdminRole({ data: { id } });
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        if (isUuid) {
          await supabase.from("user_roles").delete().eq("id", id);
        }
      } catch {
        // ignore
      }
      toast.success(`Removed ${roleName.replace(/_/g, " ")} role from ${adminEmail}`);
      qc.invalidateQueries({ queryKey: ["admin", "admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit"] });
      qc.invalidateQueries({ queryKey: ["admin"] });
    } catch {
      toast.error("Failed to revoke role");
    }
  };

  return (
    <>
      <PageHeader
        title="Administrators & Roles"
        desc="Role-based permissions and authorized team access"
      />

      {/* Overview Stat Cards showing role breakdown */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Total Admins" value={counts.total} sub="Active team members" />
        <Stat label="Super Admins" value={counts.super_admin} sub="Full system control" />
        <Stat label="Managers" value={counts.manager} sub="Partners & offers" />
        <Stat label="Card Managers" value={counts.membership_manager} sub="Cards & memberships" />
        <Stat label="Support Staff" value={counts.support} sub="Read-only inquiry" />
      </div>

      {/* Role Permission Scope Reference */}
      <div className="mt-6">
        <Panel title="Role Privilege Matrix · Granted Permissions Overview">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((r) => {
              const cfg = ROLE_CONFIG[r];
              return (
                <div key={r} className="rounded-xl border border-[#ececf1] bg-slate-50/60 p-3.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider ${cfg.badgeClass}`}>
                      {cfg.title}
                    </span>
                    <span className="font-mono text-xs font-bold text-muted-foreground">
                      {counts[r]} assigned
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] font-medium text-slate-600 leading-snug">
                    {cfg.description}
                  </p>
                  <div className="mt-3 space-y-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      Granted Scopes:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {cfg.permissions.map((p) => (
                        <span key={p} className="inline-flex items-center gap-1 rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-navy border border-slate-200">
                          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* Grant Role Form (for Super Admins) */}
      {isSuper && (
        <div className="mt-6 rounded-2xl border border-[#ececf1] bg-white p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-gold" />
              <h2 className="font-display text-sm font-bold text-navy">Grant Administrator Role & Credentials</h2>
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground">
              Initial password is generated automatically
            </span>
          </div>

          <form onSubmit={grant} className="grid gap-3 sm:grid-cols-12 items-end">
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1">
                Full Name (optional)
              </label>
              <Input
                placeholder="e.g. Ramesh Gupta"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 text-xs"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1">
                User Email Address *
              </label>
              <Input
                type="email"
                required
                placeholder="e.g. ramesh@pennygrade.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 text-xs"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1">
                Assign Role
              </label>
              <Select
                value={role}
                onChange={(v) => setRole(v as RoleType)}
                className="h-10 w-full text-xs"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_CONFIG[r].title}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  First-Time Password
                </label>
                <button
                  type="button"
                  onClick={() => setPassword(generateSecurePassword())}
                  className="flex items-center gap-1 text-[10px] font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
                >
                  <RefreshCw className="h-2.5 w-2.5" /> Random
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 text-xs font-mono pr-8"
                  placeholder="Set initial password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="sm:col-span-12 mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-[11px] text-muted-foreground">
                Selected role grants: <strong className="text-navy">{ROLE_CONFIG[role].title}</strong> — {ROLE_CONFIG[role].description}
              </p>
              <Button
                type="submit"
                size="sm"
                disabled={submitting || !email.trim()}
                className="rounded-lg bg-navy px-5 py-2 font-bold text-white hover:bg-navy-deep cursor-pointer"
              >
                {submitting ? "Creating Credentials…" : "Grant Role & Create Credentials"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Administrators Table */}
      <div className="mt-6">
        <h2 className="mb-3 font-display text-base font-bold text-navy flex items-center justify-between">
          <span>Active Administrators ({adminList.length})</span>
        </h2>

        {q.isLoading ? (
          <TableSkeleton />
        ) : (
          <DataTable
            head={["Administrator", "Email", "Assigned Role", "Granted Permissions", "Since", "Actions"]}
            empty={!adminList.length}
          >
            {adminList.map((r) => {
              const cfg = ROLE_CONFIG[r.role as RoleType] || ROLE_CONFIG.support;
              const isPrimaryOwner = r.email.toLowerCase() === "pennygradebusiness@gmail.com";

              return (
                <tr key={r.id} className="hover:bg-slate-50/70">
                  <td className={`${td}`}>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy/10 text-xs font-black text-navy uppercase">
                        {(r.full_name || r.email).slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-bold text-navy">{r.full_name || "Admin Staff"}</p>
                        <p className="text-[10px] text-muted-foreground">{r.user_id?.slice(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className={`${td} font-mono text-xs text-slate-700`}>{r.email}</td>
                  <td className={td}>
                    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${cfg.badgeClass}`}>
                      {cfg.title}
                    </span>
                  </td>
                  <td className={td}>
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {cfg.permissions.slice(0, 3).map((perm) => (
                        <span key={perm} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                          {perm}
                        </span>
                      ))}
                      {cfg.permissions.length > 3 && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                          +{cfg.permissions.length - 3} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={`${td} text-xs text-muted-foreground`}>
                    {r.created_at?.slice(0, 10)}
                  </td>
                  <td className={td}>
                    <div className="flex items-center gap-2">
                      {isSuper && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                          onClick={() => {
                            setResettingUser(r);
                            setNewResetPassword(generateSecurePassword());
                          }}
                        >
                          <KeyRound className="h-3 w-3 mr-1 text-amber-500" /> Reset Password
                        </Button>
                      )}
                      {isSuper && !isPrimaryOwner ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                          onClick={() => revoke(r.id, r.email, r.role)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          {isPrimaryOwner ? "Primary Owner" : "Protected"}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </div>

      {/* Modal: Created Administrator Credentials */}
      <Dialog open={!!createdCreds} onOpenChange={(o) => !o && setCreatedCreds(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              <DialogTitle className="text-base font-extrabold text-navy">
                Administrator Credentials Ready
              </DialogTitle>
            </div>
          </DialogHeader>

          {createdCreds && (
            <div className="space-y-4 pt-1">
              <p className="text-xs text-slate-600">
                The administrator account has been created. Share these credentials with the team member so they can complete their first-time login:
              </p>

              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-2.5">
                <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Name</span>
                  <span className="text-xs font-extrabold text-slate-900">{createdCreds.name}</span>
                </div>
                <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Email</span>
                  <span className="font-mono text-xs font-bold text-slate-900">{createdCreds.email}</span>
                </div>
                <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Assigned Role</span>
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${ROLE_CONFIG[createdCreds.role].badgeClass}`}>
                    {ROLE_CONFIG[createdCreds.role].title}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Initial Password</span>
                  <span className="font-mono text-sm font-extrabold text-amber-900 bg-white px-2.5 py-1 rounded-md border border-amber-300 shadow-xs">
                    {createdCreds.password}
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600 border border-slate-200">
                <strong>First-Time Login Instructions:</strong>
                <p className="mt-0.5">
                  1. Visit <code className="font-bold text-navy">/admin/login</code><br />
                  2. Enter their email and initial password above.<br />
                  3. They will be directed straight to their role dashboard.
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <Button
                  className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-xs font-extrabold text-white shadow-md shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 cursor-pointer"
                  onClick={() => copyCredentials(createdCreds)}
                >
                  {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
                  {copied ? "Copied to Clipboard!" : "Copy Full Login Credentials"}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl text-xs font-bold"
                  onClick={() => setCreatedCreds(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Reset Existing Admin Password */}
      <Dialog open={!!resettingUser} onOpenChange={(o) => !o && setResettingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-navy flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-amber-500" />
              Reset Password for {resettingUser?.full_name || resettingUser?.email}
            </DialogTitle>
          </DialogHeader>

          {resettingUser && (
            <div className="space-y-4 pt-1">
              <p className="text-xs text-slate-600">
                Generate or enter a new temporary password for <strong className="text-navy">{resettingUser.email}</strong>.
              </p>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    New Temporary Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewResetPassword(generateSecurePassword())}
                    className="flex items-center gap-1 text-[10px] font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
                  >
                    <RefreshCw className="h-2.5 w-2.5" /> Generate
                  </button>
                </div>
                <Input
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  className="h-10 text-xs font-mono"
                  placeholder="Enter new password"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <Button
                  disabled={resetBusy || !newResetPassword.trim()}
                  className="flex-1 rounded-xl bg-navy text-xs font-extrabold text-white hover:bg-navy-deep cursor-pointer"
                  onClick={handleResetPassword}
                >
                  {resetBusy ? "Updating…" : "Update & Copy Credentials"}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl text-xs font-bold"
                  onClick={() => setResettingUser(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
