import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard, Users, CreditCard, Layers, Tags, Store, BadgePercent, QrCode, ListChecks, BarChart3, ShieldCheck, ScrollText, Settings, Menu, LogOut,
} from "lucide-react";
import { Wordmark } from "@/components/brand";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const user = (context as { user: { id: string } }).user;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.length) throw redirect({ to: "/admin/login" });
    return { roles: roles.map((r) => r.role) };
  },
  head: () => ({ meta: [{ title: "Admin | PennyGrade" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/members", label: "Members", icon: Users },
  { to: "/admin/cards", label: "Physical Cards", icon: CreditCard },
  { to: "/admin/plans", label: "Membership Plans", icon: Layers },
  { to: "/admin/categories", label: "Categories", icon: Tags },
  { to: "/admin/partners", label: "Partners", icon: Store },
  { to: "/admin/offers", label: "Offers", icon: BadgePercent },
  { to: "/admin/qr-codes", label: "QR Codes", icon: QrCode },
  { to: "/admin/verifications", label: "Verification Logs", icon: ListChecks },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/admins", label: "Admins", icon: ShieldCheck },
  { to: "/admin/audit", label: "Audit Logs", icon: ScrollText },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

function AdminLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { roles } = Route.useRouteContext();
  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/admin/login", replace: true }); };
  const side = (
    <aside className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-5 py-5 text-navy-foreground"><Wordmark to="/admin" /></div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} onClick={() => setOpen(false)} activeOptions={{ exact: n.to === "/admin" }}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeProps={{ className: "!bg-sidebar-accent !text-sidebar-primary font-medium" }}>
            <n.icon className="h-4 w-4" />{n.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <p className="px-3 pb-2 text-[11px] uppercase tracking-widest text-sidebar-foreground/50">{roles.join(", ").replace(/_/g, " ")}</p>
        <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent"><LogOut className="h-4 w-4" />Sign out</button>
      </div>
    </aside>
  );
  return (
    <div className="flex min-h-screen bg-background">
      <div className="sticky top-0 hidden h-screen lg:block">{side}</div>
      {open && <div className="fixed inset-0 z-50 flex lg:hidden"><div className="h-full">{side}</div><button className="flex-1 bg-foreground/40" onClick={() => setOpen(false)} aria-label="Close" /></div>}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-background/90 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} className="p-2" aria-label="Menu"><Menu className="h-5 w-5" /></button>
          <span className="ml-2 font-display font-semibold">PennyGrade Admin</span>
        </header>
        <main className={cn("mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8")}><Outlet /></main>
      </div>
    </div>
  );
}
