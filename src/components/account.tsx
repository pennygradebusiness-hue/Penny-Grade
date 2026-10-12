import { Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site";
import { LOGO_URL, StatusBadge, EmptyState, PhysicalCardPreview } from "@/components/brand";
import { cn } from "@/lib/utils";
import { effectiveStatus, fmtDate, inr, maskId, relDay } from "@/lib/format";

const TABS = [
  { to: "/account", label: "Overview" },
  { to: "/account/membership", label: "Membership" },
  { to: "/account/history", label: "History" },
  { to: "/account/profile", label: "Profile" },
] as const;

export function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteLayout>
      <div className="border-b bg-card">
        <nav className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-4">
          {TABS.map((t) => (
            <Link key={t.to} to={t.to} activeOptions={{ exact: true }}
              className="whitespace-nowrap border-b-2 border-transparent px-3 py-3.5 text-sm text-muted-foreground"
              activeProps={{ className: "!border-accent !text-foreground font-medium" }}>{t.label}</Link>
          ))}
        </nav>
      </div>
      <div className="mx-auto max-w-4xl px-4 py-8">{children}</div>
    </SiteLayout>
  );
}

type M = { membership_number: string; expiry_date: string; status: string } | null;

export function MembershipCard({ name, membership, reveal }: { name: string; membership: M; reveal?: boolean }) {
  const code = membership ? (reveal ? membership.membership_number : maskId(membership.membership_number)) : "PEN-7X4P-92LM";
  return (
    <div className="w-full max-w-md space-y-3">
      <PhysicalCardPreview code={code} className="shadow-2xl" />
      {membership && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xs">
          <div>
            <p className="text-slate-400">Cardholder</p>
            <p className="font-bold text-slate-900">{name || "—"}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-400">Valid until</p>
            <p className="font-bold text-amber-600">{fmtDate(membership.expiry_date)}</p>
          </div>
          <StatusBadge status={effectiveStatus(membership)} />
        </div>
      )}
    </div>
  );
}

type H = { id: string; verification_session_id: string | null; bill_amount: number; discount_amount: number; created_at: string; partner: { business_name: string; slug: string } | null };

export function HistoryList({ rows }: { rows: H[] }) {
  if (!rows.length) return <EmptyState title="Your verification activity will appear here." />;
  return (
    <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
      {rows.map((r) => {
        const inner = (
          <>
            <div className="min-w-0">
              <p className="font-medium">{r.partner?.business_name ?? "Partner"}</p>
              <p className="text-xs text-muted-foreground">{relDay(r.created_at)}</p>
            </div>
            <div className="text-right">
              <p className="tabular font-medium">{inr(r.bill_amount)}</p>
              <p className="tabular text-xs font-semibold text-success">Saved {inr(r.discount_amount)}</p>
            </div>
          </>
        );
        return (
          <li key={r.id}>
            {r.verification_session_id ? (
              <Link to="/verification/$sessionId" params={{ sessionId: r.verification_session_id }} className={cn("flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/50")}>{inner}</Link>
            ) : <div className="flex items-center justify-between gap-4 px-5 py-4">{inner}</div>}
          </li>
        );
      })}
    </ul>
  );
}

export function AccountSkeleton() {
  return <div className="space-y-4"><div className="h-8 w-1/3 animate-pulse rounded bg-muted" /><div className="aspect-[1.586/1] max-w-md animate-pulse rounded-2xl bg-muted" /><div className="h-32 animate-pulse rounded-2xl bg-muted" /></div>;
}
