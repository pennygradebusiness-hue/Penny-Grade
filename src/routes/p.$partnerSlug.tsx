import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { LogoMark, EmptyState } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { partnerQuery } from "@/lib/queries";
import { myMemberQuery } from "@/lib/member";
import { useSession } from "@/lib/use-session";
import { supabase } from "@/integrations/supabase/client";
import { effectiveStatus, inr, offerHeadline, offerSub, formatDays } from "@/lib/format";

export const Route = createFileRoute("/p/$partnerSlug")({
  loader: async ({ context, params }) => {
    const p = await context.queryClient.ensureQueryData(partnerQuery(params.partnerSlug));
    if (!p) throw notFound();
    return { name: p.business_name };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.name} — Member Discount | PennyGrade` : "Partner not found | PennyGrade" },
      { name: "description", content: "Verify your PennyGrade member discount." },
      { name: "robots", content: "noindex" },
    ],
  }),
  notFoundComponent: () => (
    <Shell><EmptyState title="This PennyGrade partner could not be found."><Link to="/partners" className="underline">Browse partners</Link></EmptyState></Shell>
  ),
  errorComponent: () => <Shell><p className="text-center">Unable to load this partner. Please try again.</p></Shell>,
  component: QrLanding,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-navy-deep text-navy-foreground">
      <header className="mx-auto flex max-w-md items-center gap-2 px-5 pt-5">
        <LogoMark className="h-8 w-8" /><span className="font-display font-semibold">Penny<span className="text-gold">Grade</span></span>
      </header>
      <main className="mx-auto max-w-md px-5 py-6">{children}</main>
    </div>
  );
}

function QrLanding() {
  const { partnerSlug } = Route.useParams();
  const { data: p } = useSuspenseQuery(partnerQuery(partnerSlug));
  const { user, loading } = useSession();
  const me = useQuery({ ...myMemberQuery, enabled: !!user });
  const navigate = useNavigate();
  const [bill, setBill] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!p) return null;
  const offer = p.offers[0];

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const amount = Number(bill);
    if (!Number.isFinite(amount) || amount <= 0) return setErr("Please enter a valid bill amount.");
    setBusy(true);
    const { data, error } = await supabase.rpc("create_verification", { _partner_slug: partnerSlug, _bill: amount });
    setBusy(false);
    const res = data as { ok: boolean; session_id?: string; message?: string } | null;
    if (error || !res) return setErr("Unable to verify membership. Please try again.");
    if (!res.ok) return setErr(res.message ?? "Unable to verify membership. Please try again.");
    toast.success("Verification created");
    navigate({ to: "/verification/$sessionId", params: { sessionId: res.session_id! } });
  };

  const m = me.data?.membership;
  const mStatus = m ? effectiveStatus(m) : null;

  return (
    <Shell>
      <div className="rounded-3xl bg-card p-6 text-card-foreground shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{p.category?.name}</p>
        <h1 className="mt-1 text-2xl font-semibold">{p.business_name}</h1>
        {offer ? (
          <div className="mt-5 rounded-2xl bg-navy p-5 text-navy-foreground">
            <p className="font-display text-4xl font-bold text-gold">{offerHeadline(offer)}</p>
            <p className="mt-1 text-navy-muted">{offerSub(offer)}</p>
            {Number(offer.minimum_bill) > 0 && <p className="mt-1 text-sm text-navy-muted">Minimum bill {inr(offer.minimum_bill)}</p>}
            <p className="mt-1 text-xs text-navy-muted">{formatDays(offer.valid_days)} · Unlimited usage</p>
          </div>
        ) : <p className="mt-5 rounded-xl bg-muted p-4 text-sm">This offer is currently unavailable.</p>}

        <div className="mt-6">
          {loading || (user && me.isLoading) ? (
            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !user ? (
            <div className="text-center">
              <p className="font-medium">Log in to use your PennyGrade membership</p>
              <Button asChild size="lg" className="mt-4 w-full"><Link to="/login" search={{ redirect: `/p/${partnerSlug}` }}>Log in</Link></Button>
              <Link to="/register" search={{ redirect: `/p/${partnerSlug}` }} className="mt-3 block text-sm text-muted-foreground underline">Not a member yet? Join PennyGrade</Link>
            </div>
          ) : !m || mStatus !== "ACTIVE" ? (
            <Notice>{mStatus === "EXPIRED" ? "Your PennyGrade membership has expired. Please contact PennyGrade support to renew it." : "You don't currently have an active PennyGrade membership."}</Notice>
          ) : offer ? (
            <form onSubmit={verify}>
              <p className="mb-1 flex items-center gap-1.5 text-xs text-success"><ShieldCheck className="h-4 w-4" />Membership detected · {me.data?.profile?.full_name}</p>
              <label htmlFor="bill" className="text-lg font-semibold">Enter your bill amount</label>
              <div className="mt-3 flex items-center rounded-2xl border-2 border-input bg-background px-4 focus-within:border-ring">
                <span className="font-display text-3xl font-semibold text-muted-foreground">₹</span>
                <input id="bill" inputMode="decimal" autoFocus value={bill}
                  onChange={(e) => setBill(e.target.value.replace(/[^0-9.]/g, "").slice(0, 10))}
                  className="tabular h-16 w-full bg-transparent px-2 font-display text-3xl font-semibold outline-none" placeholder="0" />
              </div>
              {err && <Notice>{err}</Notice>}
              <Button type="submit" size="lg" disabled={busy || !bill} className="mt-4 h-14 w-full text-base">
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify Discount"}
              </Button>
              {offer.terms_conditions && <p className="mt-4 text-xs text-muted-foreground">{offer.terms_conditions}</p>}
            </form>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 flex gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{children}</p>;
}
