import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BadgeCheck, Clock, XCircle, ArrowLeft, ShieldCheck, CheckCircle2 } from "lucide-react";
import { LogoMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { fmtTime, inr } from "@/lib/format";
import { getPublicVerificationSession } from "@/lib/public.functions";

export const Route = createFileRoute("/verification/$sessionId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Live Verification | PennyGrade" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerificationScreen,
});

function VerificationScreen() {
  const { sessionId } = Route.useParams();
  const validUuid = /^[0-9a-f-]{36}$/i.test(sessionId);

  const { data: s, isLoading } = useQuery({
    queryKey: ["public-verification", sessionId],
    enabled: validUuid,
    queryFn: async () => {
      return await getPublicVerificationSession({ data: { sessionId } });
    },
    refetchInterval: (query) => {
      return query.state.data?.status === "ACTIVE" ? 10_000 : false;
    },
  });

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (isLoading) {
    return (
      <Frame>
        <div className="mx-auto mt-20 max-w-md px-4">
          <div className="h-96 animate-pulse rounded-[16px] bg-white/10" />
        </div>
      </Frame>
    );
  }

  if (!s || !validUuid) {
    return (
      <Frame>
        <Message
          title="Unable to find verification. Please try again."
          icon={<XCircle className="h-14 w-14 text-destructive" />}
        >
          <p className="mt-2 text-xs text-navy-muted">
            The verification session could not be found or has expired.
          </p>
          <Button asChild className="mt-6 rounded-[9px] bg-gold font-bold text-accent-foreground hover:bg-gold-soft">
            <Link to="/partners">Browse Partner Outlets</Link>
          </Button>
        </Message>
      </Frame>
    );
  }

  const expires = new Date(s.expires_at).getTime();
  const left = Math.max(0, Math.floor((expires - now) / 1000));
  const live = s.status === "ACTIVE" && left > 0;
  const pct =
    s.discount_type === "PERCENTAGE"
      ? `${Number(s.discount_value)}%`
      : inr(s.discount_value);

  if (!live) {
    return (
      <Frame>
        <Message
          title="This verification has expired."
          icon={<XCircle className="h-14 w-14 text-destructive" />}
        >
          <div className="mt-4 rounded-xl border border-white/15 bg-white/5 p-4 text-xs text-navy-muted">
            <p className="font-bold text-white text-sm">{s.partner_name}</p>
            <p className="mt-1">
              Bill: {inr(s.bill_amount)} · Generated: {fmtTime(s.created_at)}
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-2.5 w-full">
            <Button asChild className="rounded-[9px] bg-gold font-bold text-accent-foreground hover:bg-gold-soft">
              <Link to="/p/$partnerSlug" params={{ partnerSlug: s.partner_slug }}>
                Generate New Verification
              </Link>
            </Button>
            <Button asChild variant="ghost" className="text-navy-muted hover:text-white">
              <Link to="/history">View Verification History</Link>
            </Button>
          </div>
        </Message>
      </Frame>
    );
  }

  const mm = String(Math.floor(left / 60)).padStart(1, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <Frame>
      {/* Top Header Bar */}
      <header className="shrink-0 px-4 py-2 border-b border-white/10 bg-navy-deep/80 backdrop-blur-xs">
        <div className="mx-auto max-w-md flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1.5">
            <LogoMark className="h-6 w-6" />
            <span className="font-display text-sm font-extrabold text-white">
              Penny<span className="text-gold">Grade</span>
            </span>
          </Link>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-emerald-400 ring-1 ring-emerald-500/40">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            LIVE VERIFICATION
          </span>
        </div>
      </header>

      {/* Main Content Area: Centered, Non-Scrollable */}
      <main className="mx-auto w-full max-w-md flex-1 px-3 sm:px-4 py-1.5 sm:py-2 flex flex-col justify-center overflow-hidden">
        {/* High-Contrast Verification Card */}
        <div className="overflow-hidden rounded-[16px] border border-white/15 bg-white text-navy shadow-2xl">
          {/* Verified Green Banner */}
          <div className="bg-emerald-600 px-4 py-2.5 sm:py-3 text-center text-white">
            <div className="flex items-center justify-center gap-2">
              <BadgeCheck className="h-6 w-6 text-white" strokeWidth={2.4} />
              <p className="font-display text-xl sm:text-2xl font-black tracking-wide">
                VERIFIED
              </p>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-100">
              PennyGrade Member Benefit Applied
            </p>
          </div>

          {/* Partner & Member details */}
          <div className="px-4 py-2 text-center border-b border-[#ececf1]">
            <p className="font-display text-lg sm:text-xl font-black uppercase tracking-wide text-navy truncate">
              {s.partner_name}
            </p>
            <p className="text-[11px] font-bold text-muted-foreground">
              Membership Verified · {s.member_name}
            </p>
          </div>

          {/* Breakdown Table */}
          <dl className="mx-4 my-2 divide-y divide-[#ececf1] text-[11px] sm:text-xs">
            <div className="flex justify-between py-1.5">
              <dt className="font-semibold text-muted-foreground">Bill Amount</dt>
              <dd className="tabular font-extrabold text-navy">{inr(s.bill_amount)}</dd>
            </div>
            <div className="flex justify-between py-1.5">
              <dt className="font-semibold text-muted-foreground">Member Discount</dt>
              <dd className="tabular font-extrabold text-navy">{pct}</dd>
            </div>
            <div className="flex justify-between py-1.5">
              <dt className="font-semibold text-muted-foreground">You Save</dt>
              <dd className="tabular font-extrabold text-emerald-600">{inr(s.discount_amount)}</dd>
            </div>
          </dl>

          {/* Customer Pays Display */}
          <div className="bg-[#fafafc] px-4 py-2.5 text-center border-y border-[#ececf1]">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.25em] text-muted-foreground">
              Customer Pays
            </p>
            <p className="tabular mt-0.5 font-display text-4xl sm:text-5xl font-black tracking-tight text-navy">
              {inr(s.final_amount)}
            </p>
          </div>

          {/* Live Timer Dark Block */}
          <div className="bg-navy px-4 py-2.5 text-white">
            <div className="flex items-center justify-between text-[11px]">
              <div>
                <p className="text-[9px] text-navy-muted">Generated</p>
                <p className="font-bold">{fmtTime(s.created_at)}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-navy-muted">Expires in</p>
                <p className="tabular flex items-center justify-center gap-1 font-display text-xl font-extrabold text-gold">
                  <Clock className="h-3.5 w-3.5" />
                  {mm}:{ss}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-navy-muted">Valid until</p>
                <p className="font-bold">{fmtTime(s.expires_at)}</p>
              </div>
            </div>

            {/* Countdown Progress Bar */}
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-gold transition-all duration-1000 ease-linear"
                style={{ width: `${Math.min(100, (left / 300) * 100)}%` }}
              />
            </div>

            <p className="mt-1.5 text-center font-mono text-[8px] tracking-widest text-navy-muted uppercase">
              SESSION ID · {s.id.slice(0, 8)}
            </p>
          </div>
        </div>

        {/* Staff Instructions Banner */}
        <div className="mt-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-center">
          <p className="text-[11px] font-medium text-navy-muted">
            Show this screen to counter staff to verify running timer.
          </p>
        </div>

        {/* Customer Return Actions (Done / Complete Visit) */}
        <div className="mt-2.5 space-y-2">
          <Button
            asChild
            className="h-10 sm:h-11 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 font-display text-xs sm:text-sm font-extrabold text-white shadow-md shadow-emerald-500/20 hover:from-emerald-400 hover:to-emerald-500 transition-all cursor-pointer"
          >
            <Link to="/partners/$slug" params={{ slug: s.partner_slug }}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Done — Complete Visit
            </Link>
          </Button>

          <div className="flex items-center justify-between px-1 text-[11px]">
            <Link
              to="/p/$partnerSlug"
              params={{ partnerSlug: s.partner_slug }}
              className="inline-flex items-center gap-1 font-semibold text-navy-muted transition-colors hover:text-white"
            >
              <ArrowLeft className="h-3 w-3" /> New Verification
            </Link>
            <Link
              to="/partners"
              className="font-semibold text-gold transition-colors hover:underline"
            >
              Browse Other Partners →
            </Link>
          </div>
        </div>
      </main>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen h-[100dvh] max-h-[100dvh] bg-navy-deep text-white flex flex-col overflow-hidden">
      {children}
    </div>
  );
}

function Message({
  title,
  children,
  icon,
}: {
  title: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-6 pt-24 text-center text-white">
      {icon ?? <LogoMark className="h-12 w-12" />}
      <p className="mt-4 font-display text-lg font-bold">{title}</p>
      {children}
    </div>
  );
}
