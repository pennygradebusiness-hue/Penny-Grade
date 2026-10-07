import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { QrCode, ArrowRight } from "lucide-react";
import { AccountLayout, MembershipCard, HistoryList, AccountSkeleton } from "@/components/account";
import { EmptyState } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { myHistoryQuery, myMemberQuery } from "@/lib/member";
import { categoriesQuery, partnersQuery, categoryIcon } from "@/lib/queries";
import { effectiveStatus, inr, offerHeadline } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/account/")({
  head: () => ({ meta: [{ title: "My Account | PennyGrade" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

function Dashboard() {
  const me = useQuery(myMemberQuery);
  const history = useQuery(myHistoryQuery(5));
  const partners = useQuery(partnersQuery);
  const cats = useQuery(categoriesQuery);
  if (me.isLoading) return <AccountLayout><AccountSkeleton /></AccountLayout>;
  const m = me.data?.membership ?? null;
  const name = me.data?.profile?.full_name ?? "";
  const active = m && effectiveStatus(m) === "ACTIVE";
  const saved = (history.data ?? []).reduce((s, r) => s + Number(r.discount_amount), 0);

  return (
    <AccountLayout>
      <h1 className="text-2xl font-semibold md:text-3xl">Welcome, {name.split(" ")[0] || "member"}</h1>
      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_1fr]">
        <MembershipCard name={name} membership={m} />
        <div className="flex flex-col gap-4">
          {!active && (
            <div className="rounded-2xl border border-warning/40 bg-warning/10 p-5 text-sm">
              {m ? (effectiveStatus(m) === "EXPIRED" ? "Your PennyGrade membership has expired. Please contact PennyGrade support to renew it." : `Your membership is ${effectiveStatus(m).toLowerCase()}. Please contact PennyGrade support.`)
                : "You don't currently have an active PennyGrade membership. Our team will activate it once your membership is confirmed."}
            </div>
          )}
          <div className="rounded-2xl border bg-card p-5">
            <QrCode className="h-6 w-6 text-accent-foreground" />
            <p className="mt-3 font-semibold">At a partner?</p>
            <p className="mt-1 text-sm text-muted-foreground">Scan the PennyGrade QR at the counter with your phone camera to get your discount.</p>
          </div>
          {saved > 0 && <div className="rounded-2xl bg-navy p-5 text-navy-foreground"><p className="text-xs uppercase tracking-widest text-gold">Recently saved</p><p className="mt-1 font-display text-3xl font-bold">{inr(saved)}</p></div>}
        </div>
      </div>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">Featured offers</h2><Link to="/partners" className="flex items-center gap-1 text-sm text-primary">Explore partners <ArrowRight className="h-4 w-4" /></Link></div>
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
          {(partners.data ?? []).filter((p) => p.offers[0]).slice(0, 8).map((p) => (
            <Link key={p.id} to="/partners/$slug" params={{ slug: p.slug }} className="w-44 shrink-0 rounded-2xl border bg-card p-4 hover:border-accent">
              <p className="truncate text-sm font-medium">{p.business_name}</p>
              <p className="mt-2 font-display text-xl font-bold text-primary">{offerHeadline(p.offers[0])}</p>
              <p className="text-xs text-muted-foreground">{p.category?.name}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Categories</h2>
        <div className="flex flex-wrap gap-2">
          {(cats.data ?? []).map((c) => { const I = categoryIcon(c.icon); return (
            <Link key={c.id} to="/partners" search={{ category: c.slug }} className="flex items-center gap-2 rounded-full border bg-card px-3.5 py-2 text-sm hover:border-accent"><I className="h-4 w-4" />{c.name}</Link>
          ); })}
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">Recent activity</h2>
          <Button asChild variant="ghost" size="sm"><Link to="/account/history">View all</Link></Button></div>
        {history.isLoading ? <div className="h-24 animate-pulse rounded-2xl bg-muted" /> : <HistoryList rows={(history.data ?? []) as never} />}
      </section>
      {!m && <div className="mt-8"><EmptyState title="Need help activating your membership?">Contact support@pennygrade.com</EmptyState></div>}
    </AccountLayout>
  );
}
