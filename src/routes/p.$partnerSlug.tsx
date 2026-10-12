import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  Loader2,
  AlertCircle,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  Crown,
  CheckCircle2,
  Store,
  MapPin,
} from "lucide-react";
import { LogoMark, EmptyState, PhysicalCardPreview } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { partnerQuery } from "@/lib/queries";
import { inr, offerHeadline, offerSub, formatDays } from "@/lib/format";
import { createPublicVerification, verifyMemberInput } from "@/lib/public.functions";

export const Route = createFileRoute("/p/$partnerSlug")({
  loader: async ({ context, params }) => {
    const p = await context.queryClient.ensureQueryData(partnerQuery(params.partnerSlug));
    if (!p) throw notFound();
    return { name: p.business_name };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.name} — Member Discount | PennyGrade`
          : "Partner not found | PennyGrade",
      },
      { name: "description", content: "Verify your PennyGrade member discount at the billing counter." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  notFoundComponent: () => (
    <Shell>
      <EmptyState title="This PennyGrade partner could not be found.">
        <Link to="/partners" className="underline font-bold text-navy">
          Browse partners
        </Link>
      </EmptyState>
    </Shell>
  ),
  errorComponent: () => (
    <Shell>
      <p className="text-center font-bold text-navy">Unable to load this partner. Please try again.</p>
    </Shell>
  ),
  component: QrLanding,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen h-[100dvh] max-h-[100dvh] bg-[#fafafc] text-foreground flex flex-col overflow-hidden">
      <header className="shrink-0 border-b border-[#ececf1] bg-white/95 px-4 py-2.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <LogoMark className="h-7 w-7" />
            <span className="font-display text-base font-extrabold text-navy">
              Penny<span className="text-gold">Grade</span>
            </span>
          </Link>
          <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-navy">
            Counter Standee QR
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-3 sm:px-4 py-2 sm:py-3 flex flex-col justify-center overflow-hidden">
        {children}
      </main>
    </div>
  );
}

function QrLanding() {
  const { partnerSlug } = Route.useParams();
  const { data: p } = useSuspenseQuery(partnerQuery(partnerSlug));
  const navigate = useNavigate();

  const [membershipNum, setMembershipNum] = useState("");
  const [bill, setBill] = useState("");
  const [verifiedMember, setVerifiedMember] = useState<{
    member_name: string;
    membership_number: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [verifyingNum, setVerifyingNum] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!p) return null;
  const offer = p.offers[0];

  // Quick verify membership number on blur
  const handleVerifyNumber = async () => {
    if (!membershipNum || membershipNum.trim().length < 5) return;
    setVerifyingNum(true);
    setErr(null);
    try {
      const res = await verifyMemberInput({ data: { membershipNumber: membershipNum } });
      if (res.ok && res.member_name) {
        setVerifiedMember({
          member_name: res.member_name,
          membership_number: res.membership_number!,
        });
      } else {
        setVerifiedMember(null);
        setErr(
          res.message ??
            "Unable to verify membership. Please check your membership number and try again."
        );
      }
    } catch {
      setVerifiedMember(null);
      setErr("Unable to verify membership. Please check your membership number and try again.");
    } finally {
      setVerifyingNum(false);
    }
  };

  const handleVerifyDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    const num = membershipNum.trim();
    if (!num) {
      return setErr("Please enter your PennyGrade physical membership number.");
    }

    const amount = Number(bill);
    if (!Number.isFinite(amount) || amount <= 0) {
      return setErr("Please enter a valid bill amount.");
    }

    if (offer && Number(offer.minimum_bill) > 0 && amount < Number(offer.minimum_bill)) {
      return setErr(
        `This offer requires a minimum bill of ₹${Number(offer.minimum_bill).toLocaleString(
          "en-IN"
        )}.`
      );
    }

    setBusy(true);
    try {
      const res = await createPublicVerification({
        data: {
          partnerSlug,
          membershipNumber: num,
          billAmount: amount,
        },
      });

      if (!res.ok || !res.session_id) {
        setErr(
          res.message ??
            "Unable to verify membership. Please check your membership number and try again."
        );
        setBusy(false);
        return;
      }

      toast.success("Discount verified!");
      navigate({
        to: "/verification/$sessionId",
        params: { sessionId: res.session_id },
      });
    } catch {
      setErr("Unable to verify membership. Please check your membership number and try again.");
      setBusy(false);
    }
  };

  return (
    <Shell>
      <div className="overflow-hidden rounded-[16px] border border-[#ececf1] bg-white p-4 sm:p-5 shadow-card">
        {/* Partner Info Strip */}
        <div className="flex items-center justify-between gap-3 border-b border-[#ececf1] pb-3">
          <div className="min-w-0">
            <span className="inline-block rounded-full bg-navy/5 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-navy">
              {p.category?.name ?? "Partner Business"}
            </span>
            <h1 className="mt-0.5 font-display text-lg font-extrabold text-navy truncate">
              {p.business_name}
            </h1>
            {p.city && (
              <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground truncate">
                <MapPin className="h-3 w-3 text-gold shrink-0" />
                <span className="truncate">{[p.address, p.city].filter(Boolean).join(", ")}</span>
              </p>
            )}
          </div>
          {p.logo_url && (
            <img
              src={p.logo_url}
              alt=""
              className="h-10 w-10 rounded-xl border border-[#ececf1] object-cover shadow-xs shrink-0"
            />
          )}
        </div>

        {/* Active Offer Banner */}
        {offer ? (
          <div className="mt-3 rounded-xl bg-gradient-to-r from-slate-900 via-slate-950 to-black px-3.5 py-2.5 text-white shadow-md border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-display text-2xl font-extrabold text-amber-400">
                  {offerHeadline(offer)}
                </span>
                <span className="ml-2 text-xs font-semibold text-slate-300">
                  {offerSub(offer)}
                </span>
              </div>
              <span className="rounded-full bg-amber-400/20 border border-amber-400/30 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-300 shrink-0">
                Unlimited
              </span>
            </div>
            {Number(offer.minimum_bill) > 0 && (
              <p className="mt-1 text-[10px] text-slate-400">
                Minimum bill: <span className="font-bold text-white">{inr(offer.minimum_bill)}</span>
              </p>
            )}
          </div>
        ) : (
          <div className="mt-3 rounded-xl bg-slate-50 p-2.5 text-xs font-semibold text-slate-500 border border-slate-200">
            This partner currently does not have an active voucher.
          </div>
        )}

        {/* Customer In-Person Verification Form */}
        {offer && (
          <form onSubmit={handleVerifyDiscount} className="mt-3.5 space-y-3">
            {/* Physical Card Reference Guide */}
            <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-1.5 text-xs text-slate-700">
              <div className="flex items-center gap-1.5 min-w-0">
                <CreditCard className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="text-[11px] text-slate-700 truncate">
                  Have card ready: e.g. <span className="font-mono font-bold text-amber-800">PEN-7X4P-92LM</span>
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 shrink-0">
                Physical Card
              </span>
            </div>

            {/* Step 1: Membership Number */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="membership"
                  className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-900"
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-extrabold text-white">
                    1
                  </span>
                  Physical Membership Number
                </Label>
                {verifyingNum && <Loader2 className="h-3 w-3 animate-spin text-amber-500" />}
              </div>
              <div className="relative">
                <Input
                  id="membership"
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  placeholder="e.g. PEN-7X4P-92LM"
                  value={membershipNum}
                  onChange={(e) => {
                    setMembershipNum(e.target.value.toUpperCase());
                    setVerifiedMember(null);
                    setErr(null);
                  }}
                  onBlur={handleVerifyNumber}
                  className="h-10 rounded-lg border-slate-200 font-mono text-sm font-bold uppercase tracking-wider shadow-xs focus:border-amber-400"
                />
                <CreditCard className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>

              {verifiedMember && (
                <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Verified · {verifiedMember.member_name}</span>
                </div>
              )}
            </div>

            {/* Step 2: Bill Amount */}
            <div className="space-y-1">
              <Label
                htmlFor="bill"
                className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-900"
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-extrabold text-white">
                  2
                </span>
                Total Bill Amount
              </Label>
              <div className="flex items-center rounded-lg border-2 border-slate-200 bg-white px-3 focus-within:border-amber-400 shadow-xs transition-colors">
                <span className="font-display text-lg font-bold text-slate-400">₹</span>
                <input
                  id="bill"
                  inputMode="decimal"
                  value={bill}
                  onChange={(e) => {
                    setBill(e.target.value.replace(/[^0-9.]/g, "").slice(0, 10));
                    setErr(null);
                  }}
                  className="h-10 w-full bg-transparent px-2 font-display text-xl font-extrabold text-slate-900 outline-none"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Error Notice */}
            {err && (
              <div className="flex items-start gap-1.5 rounded-lg bg-destructive/10 p-2 text-[11px] font-semibold text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{err}</span>
              </div>
            )}

            {/* Verify Button */}
            <Button
              type="submit"
              size="lg"
              disabled={busy || !membershipNum || !bill}
              className="h-11 w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 font-display text-sm font-extrabold text-white shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 transition-all cursor-pointer"
            >
              {busy ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Verify Discount & Show Staff <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>
        )}
      </div>

      <div className="mt-2 text-center">
        <p className="text-[11px] text-slate-500 font-medium">
          Zero login or app download required · Show running timer to counter staff
        </p>
      </div>
    </Shell>
  );
}
