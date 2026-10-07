import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BadgeCheck, Clock, XCircle } from "lucide-react";
import { LogoMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/use-session";
import { fmtTime, inr } from "@/lib/format";

export const Route = createFileRoute("/verification/$sessionId")({
  ssr: false,
  head: () => ({ meta: [{ title: "Live Verification | PennyGrade" }, { name: "robots", content: "noindex" }] }),
  component: Verification,
});

function Verification() {
  const { sessionId } = Route.useParams();
  const { user, loading } = useSession();
  const valid = /^[0-9a-f-]{36}$/i.test(sessionId);
  const q = useQuery({
    queryKey: ["verification", sessionId],
    enabled: !!user && valid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_sessions")
        .select("id,bill_amount,discount_amount,final_amount,status,expires_at,created_at,partner:partners(business_name),offer:offers(discount_type,discount_value),membership:memberships(membership_number,user_id)")
        .eq("id", sessionId).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("user_id", data.membership!.user_id).maybeSingle();
      return { ...data, member_name: prof?.full_name ?? "" };
    },
  });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  if (loading || q.isLoading) return <Frame><div className="mx-auto mt-24 h-96 max-w-md animate-pulse rounded-3xl bg-navy" /></Frame>;
  if (!user) return <Frame><Message title="Log in to view this verification"><Button asChild className="mt-4"><Link to="/login" search={{ redirect: `/verification/${sessionId}` }}>Log in</Link></Button></Message></Frame>;
  const s = q.data;
  if (!s) return <Frame><Message title="Unable to verify membership. Please try again." /></Frame>;

  const expires = new Date(s.expires_at).getTime();
  const left = Math.max(0, Math.floor((expires - now) / 1000));
  const live = s.status === "ACTIVE" && left > 0;
  const pct = s.offer?.discount_type === "PERCENTAGE" ? `${Number(s.offer.discount_value)}%` : inr(s.offer?.discount_value);

  if (!live) return (
    <Frame>
      <Message title="This verification has expired. Please generate a new verification." icon={<XCircle className="h-12 w-12 text-destructive" />}>
        <p className="mt-2 text-sm text-navy-muted">{s.partner?.business_name} · {inr(s.bill_amount)} · generated {fmtTime(s.created_at)}</p>
        <Button asChild className="mt-6 bg-gold text-accent-foreground hover:bg-gold-soft"><Link to="/account/history">Back to history</Link></Button>
      </Message>
    </Frame>
  );

  const mm = String(Math.floor(left / 60)).padStart(1, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <Frame>
      <div className="mx-auto max-w-md px-4 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><LogoMark className="h-8 w-8" /><span className="font-display font-semibold text-navy-foreground">Penny<span className="text-gold">Grade</span></span></div>
          <span className="flex items-center gap-2 rounded-full bg-success/15 px-3 py-1 text-xs font-bold tracking-widest text-success">
            <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" /></span>
            LIVE
          </span>
        </div>

        <div className="mt-5 overflow-hidden rounded-3xl bg-card text-card-foreground shadow-2xl">
          <div className="bg-success px-6 py-6 text-center text-success-foreground">
            <BadgeCheck className="mx-auto h-14 w-14" strokeWidth={2.2} />
            <p className="mt-2 font-display text-4xl font-extrabold tracking-wide">VERIFIED</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.25em] opacity-90">PennyGrade Member Benefit</p>
          </div>
          <div className="px-6 pt-5 text-center">
            <p className="font-display text-2xl font-bold uppercase tracking-wide">{s.partner?.business_name}</p>
            <p className="mt-1 text-sm text-muted-foreground">Membership Verified · {s.member_name}</p>
          </div>
          <dl className="mx-6 mt-5 divide-y border-y text-base">
            <div className="flex justify-between py-3"><dt className="text-muted-foreground">Bill Amount</dt><dd className="tabular font-semibold">{inr(s.bill_amount)}</dd></div>
            <div className="flex justify-between py-3"><dt className="text-muted-foreground">Member Discount</dt><dd className="tabular font-semibold">{pct}</dd></div>
            <div className="flex justify-between py-3"><dt className="text-muted-foreground">You Save</dt><dd className="tabular font-bold text-success">{inr(s.discount_amount)}</dd></div>
          </dl>
          <div className="px-6 py-6 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Customer Pays</p>
            <p className="tabular mt-1 font-display text-6xl font-extrabold">{inr(s.final_amount)}</p>
          </div>
          <div className="bg-navy px-6 py-4 text-navy-foreground">
            <div className="flex items-center justify-between text-sm">
              <div><p className="text-xs text-navy-muted">Generated</p><p className="font-semibold">{fmtTime(s.created_at)}</p></div>
              <div className="text-center"><p className="text-xs text-navy-muted">Expires in</p><p className="tabular flex items-center gap-1 font-display text-2xl font-bold text-gold"><Clock className="h-4 w-4" />{mm}:{ss}</p></div>
              <div className="text-right"><p className="text-xs text-navy-muted">Valid until</p><p className="font-semibold">{fmtTime(s.expires_at)}</p></div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sidebar-accent"><div className="h-full bg-gold transition-all" style={{ width: `${Math.min(100, (left / 300) * 100)}%` }} /></div>
            <p className="mt-3 text-center font-mono text-[10px] tracking-widest text-navy-muted">LIVE VERIFICATION · {s.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
        <p className="mt-5 text-center text-sm font-medium text-navy-foreground">Show this screen to the staff.</p>
      </div>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-navy-deep">{children}</div>;
}
function Message({ title, children, icon }: { title: string; children?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-6 pt-28 text-center text-navy-foreground">
      {icon ?? <LogoMark className="h-12 w-12" />}
      <p className="mt-4 text-lg font-semibold">{title}</p>
      {children}
    </div>
  );
}
