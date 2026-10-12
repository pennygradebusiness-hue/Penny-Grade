import { createFileRoute, Link, Outlet, redirect, useNavigate, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Layers,
  Tags,
  Store,
  BadgePercent,
  QrCode,
  ListChecks,
  BarChart3,
  ShieldCheck,
  ScrollText,
  Settings,
  Menu,
  X,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { Wordmark } from "@/components/brand";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const user = (context as { user?: { id: string } })?.user;
    if (user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
      try {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
        if (roles && roles.length > 0) {
          return { roles: roles.map((r) => r.role) };
        }
      } catch {
        // ignore
      }
    }

    if (typeof window !== "undefined") {
      let raw = localStorage.getItem("pennygrade_admin_session");
      if (!raw && typeof document !== "undefined") {
        const match = document.cookie.match(/(?:^|;\s*)pennygrade_admin_session=([^;]+)/);
        if (match) raw = decodeURIComponent(match[1]);
      }
      if (raw) {
        if (typeof document !== "undefined") {
          document.cookie = `pennygrade_admin_session=${encodeURIComponent(raw)}; path=/; max-age=604800; SameSite=Lax`;
        }
        try {
          const parsed = JSON.parse(raw);
          return { roles: [parsed.role || "super_admin"] };
        } catch {
          return { roles: ["super_admin"] };
        }
      }
    }

    throw redirect({ to: "/admin/login" });
  },
  head: () => ({ meta: [{ title: "Admin | PennyGrade" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminLayout,
});

/** Most important daily operational actions displayed prominently in the top navbar */
const NAVBAR_PRIMARY_NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/members", label: "Members", icon: Users },
  { to: "/admin/partners", label: "Partners", icon: Store },
  { to: "/admin/verifications", label: "Verifications", icon: ListChecks },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
] as const;

/** Management, catalog, configuration & governance tools displayed in the left sidebar */
const SIDEBAR_SECTIONS = [
  {
    title: "Catalog & Cards",
    items: [
      { to: "/admin/offers", label: "Offers", icon: BadgePercent },
      { to: "/admin/cards", label: "Physical Cards", icon: CreditCard },
      { to: "/admin/plans", label: "Membership Plans", icon: Layers },
      { to: "/admin/categories", label: "Categories", icon: Tags },
      { to: "/admin/qr-codes", label: "QR Codes", icon: QrCode },
    ],
  },
  {
    title: "Governance & System",
    items: [
      { to: "/admin/admins", label: "Admins & Roles", icon: ShieldCheck },
      { to: "/admin/audit", label: "Audit Logs", icon: ScrollText },
      { to: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
] as const;

function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { roles } = Route.useRouteContext();

  const signOut = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("pennygrade_admin_session");
      document.cookie = "pennygrade_admin_session=; path=/; max-age=0";
    }
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    navigate({ to: "/admin/login", replace: true });
  };

  const primaryRoleLabel = roles?.[0] ? roles[0].replace(/_/g, " ") : "Admin";

  const sidebarContent = (
    <aside className="flex h-full w-64 flex-col bg-navy-deep text-sidebar-foreground border-r border-white/10 selection:bg-amber-500/30">
      {/* Brand in top left of sidebar with guaranteed visible Penny text */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <Wordmark invert to="/admin" />
        <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider text-amber-400 uppercase">
          V1
        </span>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Quick mobile links to navbar items when drawer is open */}
        <div className="lg:hidden space-y-1">
          <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-navy-muted">
            Core Operations
          </p>
          {NAVBAR_PRIMARY_NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setMobileOpen(false)}
              activeOptions={{ exact: n.to === "/admin" }}
              className="flex items-center gap-3 rounded-[8px] px-3.5 py-2 text-xs font-bold text-navy-muted hover:bg-white/5 hover:text-white transition-colors"
              activeProps={{ className: "!bg-gold !text-accent-foreground font-extrabold shadow-sm" }}
            >
              <n.icon className="h-4 w-4 shrink-0" />
              <span>{n.label}</span>
            </Link>
          ))}
        </div>

        {/* Sidebar Sections */}
        {SIDEBAR_SECTIONS.map((sec) => (
          <div key={sec.title} className="space-y-1">
            <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-navy-muted">
              {sec.title}
            </p>
            {sec.items.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-[8px] px-3.5 py-2.5 text-xs font-bold text-navy-muted hover:bg-white/5 hover:text-white transition-colors"
                activeProps={{ className: "!bg-gold !text-accent-foreground font-extrabold shadow-sm" }}
              >
                <n.icon className="h-4 w-4 shrink-0" />
                <span>{n.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </div>

      {/* Sidebar Footer */}
      <div className="border-t border-white/10 p-3 space-y-2">
        <Link
          to="/"
          target="_blank"
          className="flex w-full items-center justify-between rounded-[8px] border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-bold text-gold hover:bg-white/10 transition-colors"
        >
          <span>Public Website</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
        <p className="px-3 text-[10px] uppercase tracking-widest text-navy-muted">
          Role: {primaryRoleLabel}
        </p>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-[8px] px-3 py-2 text-xs font-bold text-navy-muted hover:bg-white/5 hover:text-rose-300 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-[#fafafc]">
      {/* Desktop Persistent Left Sidebar */}
      <div className="sticky top-0 hidden h-screen lg:block shrink-0">{sidebarContent}</div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="h-full">{sidebarContent}</div>
          <button
            className="flex-1 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          />
        </div>
      )}

      {/* Main Content View with Top Navbar */}
      <div className="min-w-0 flex-1 flex flex-col">
        {/* Top Navbar with generous breathing room */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#ececf1] bg-white/95 px-4 sm:px-6 lg:px-8 backdrop-blur-md">
          {/* Left: Mobile Toggle & Brand for Mobile */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 lg:hidden text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="lg:hidden">
              <Wordmark to="/admin" />
            </div>
            <span className="hidden xl:inline-flex font-display text-sm font-bold text-navy">
              Operations Console
            </span>
          </div>

          {/* Center: Core operational links with comfortable spacing */}
          <nav className="hidden lg:flex items-center gap-2.5 xl:gap-3.5">
            {NAVBAR_PRIMARY_NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/admin" }}
                className="flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all"
                activeProps={{
                  className: "!bg-amber-500/15 !text-amber-950 !font-extrabold border border-amber-500/30 shadow-xs",
                }}
              >
                <n.icon className="h-4 w-4 shrink-0 text-slate-500" />
                <span>{n.label}</span>
              </Link>
            ))}
          </nav>

          {/* Right: Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#ececf1] bg-white px-3 py-1.5 text-xs font-bold text-navy hover:border-gold hover:text-gold shadow-2xs transition-colors"
            >
              <span>Public Website</span>
              <ExternalLink className="h-3 w-3 opacity-60" />
            </Link>

            <span className="hidden sm:inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 capitalize border border-slate-200">
              {primaryRoleLabel}
            </span>

            <button
              onClick={signOut}
              title="Sign out"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2 py-1.5 text-xs font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Page Main Content */}
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 md:py-8 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
