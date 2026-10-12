import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { PageHeader, DataTable, td, TableSkeleton, Select, Stat, Panel } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAdminUsers, addAdmin, removeAdminRole } from "@/lib/admin.functions";
import { ShieldCheck, ShieldAlert, UserCheck, KeyRound, UserPlus, Trash2, CheckCircle2 } from "lucide-react";

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
  const [submitting, setSubmitting] = useState(false);

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
        },
      });
      toast.success(res.message || "Administrator role granted");
      setEmail("");
      setName("");
      qc.invalidateQueries({ queryKey: ["admin", "admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const revoke = async (id: string, adminEmail: string, roleName: string) => {
    if (!confirm(`Are you sure you want to remove ${roleName.replace(/_/g, " ")} role from ${adminEmail}?`)) return;
    try {
      await removeAdminRole({ data: { id } });
      toast.success(`Removed ${roleName.replace(/_/g, " ")} role from ${adminEmail}`);
      qc.invalidateQueries({ queryKey: ["admin", "admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit"] });
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
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="h-4 w-4 text-gold" />
            <h2 className="font-display text-sm font-bold text-navy">Grant New Administrator Role</h2>
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
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1">
                User Email Address *
              </label>
              <Input
                type="email"
                required
                placeholder="e.g. ramesh@pennygrade.com"
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
            <div className="sm:col-span-2">
              <Button
                type="submit"
                size="sm"
                disabled={submitting || !email.trim()}
                className="h-10 w-full rounded-lg bg-navy font-bold text-white hover:bg-navy-deep cursor-pointer"
              >
                {submitting ? "Granting…" : "Grant Role"}
              </Button>
            </div>
          </form>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Selected role grants: <strong className="text-navy">{ROLE_CONFIG[role].title}</strong> — {ROLE_CONFIG[role].description}
          </p>
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
              const isSamir = r.email.toLowerCase() === "samir@pennygrade.com";

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
                    {isSuper && !isSamir ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                        onClick={() => revoke(r.id, r.email, r.role)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                      </Button>
                    ) : (
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        {isSamir ? "Primary Owner" : "Protected"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </div>
    </>
  );
}
