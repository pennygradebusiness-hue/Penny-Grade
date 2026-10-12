import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ShieldCheck,
  History as HistoryIcon,
  Loader2,
  AlertCircle,
  ArrowRight,
  Calendar,
  CreditCard,
  Crown,
  CheckCircle2,
} from "lucide-react";
import { SiteLayout, PageHero, Breadcrumbs } from "@/components/site";
import { StatusBadge, EmptyState, PhysicalCardPreview } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtDate, fmtDateTime, inr, maskId } from "@/lib/format";
import { getPublicCustomerHistory } from "@/lib/public.functions";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Member Verification History | PennyGrade" },
      {
        name: "description",
        content:
          "View your PennyGrade discount verification history using your membership number and registered mobile.",
      },
      { property: "og:title", content: "PennyGrade Member History | Secure Audit" },
    ],
  }),
  component: HistoryPage,
});

type CustomerHistoryData = {
  member: {
    full_name: string;
    membership_number: string;
    status: string;
    expiry_date: string;
    plan_name: string;
  };
  history: Array<{
    id: string;
    verification_session_id: string;
    partner_name: string;
    offer_title: string;
    bill_amount: number;
    discount_amount: number;
    final_amount: number;
    created_at: string;
  }>;
};

function HistoryPage() {
  const [membershipNum, setMembershipNum] = useState("");
  const [mobile, setMobile] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<CustomerHistoryData | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setData(null);

    const num = membershipNum.trim();
    const mob = mobile.trim();

    if (!num) return setErr("Please enter your membership number.");
    if (!mob || mob.length < 8) return setErr("Please enter your registered mobile number.");

    setBusy(true);
    try {
      const res = await getPublicCustomerHistory({
        data: {
          membershipNumber: num,
          mobile: mob,
        },
      });

      if (!res.ok || !res.member) {
        setErr(
          res.message ??
            "Unable to verify membership details. Please check your membership number and registered mobile number."
        );
        setBusy(false);
        return;
      }

      setData(res as unknown as CustomerHistoryData);
    } catch {
      setErr(
        "Unable to verify membership details. Please check your membership number and registered mobile number."
      );
    } finally {
      setBusy(false);
    }
  };

  const totalSaved = data?.history.reduce((sum, h) => sum + Number(h.discount_amount), 0) ?? 0;

  return (
    <SiteLayout>
      <PageHero
        breadcrumbs={[{ label: "Check History" }]}
        eyebrow="Member Services"
        title="Verification History:"
        highlight="Audit Your Savings"
      >
        Check your current membership status, card validity, and past discount verification logs across partner businesses.
      </PageHero>

      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        {!data ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-amber-400">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">Secure History Lookup</h2>
                <p className="text-xs text-slate-500">
                  Enter your physical card number and registered mobile to view your account.
                </p>
              </div>
            </div>

            {/* Visual reference to the card */}
            <div className="mt-5 flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-amber-200/80 bg-slate-950 p-4 text-white shadow-md">
              <div className="w-36 shrink-0">
                <PhysicalCardPreview interactive={false} />
              </div>
              <div className="text-xs">
                <p className="font-extrabold text-amber-400">Locate Your Membership ID</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                  Your cryptographic ID (e.g. <span className="font-mono font-bold text-amber-200">PEN-7X4P-92LM</span>) is embossed on your physical membership card.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="memNum"
                  className="text-xs font-bold uppercase tracking-wider text-slate-900"
                >
                  Membership Number
                </Label>
                <Input
                  id="memNum"
                  placeholder="e.g. PEN-7X4P-92LM"
                  autoCapitalize="characters"
                  value={membershipNum}
                  onChange={(e) => {
                    setMembershipNum(e.target.value.toUpperCase());
                    setErr(null);
                  }}
                  className="h-12 rounded-xl border-slate-200 font-mono text-sm uppercase tracking-wider shadow-xs focus:border-amber-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="mob"
                  className="text-xs font-bold uppercase tracking-wider text-slate-900"
                >
                  Registered Mobile Number
                </Label>
                <Input
                  id="mob"
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={mobile}
                  onChange={(e) => {
                    setMobile(e.target.value);
                    setErr(null);
                  }}
                  className="h-12 rounded-xl border-slate-200 text-sm shadow-xs focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-500">
                  Two-factor cardholder verification ensures only you can view your personal savings history.
                </p>
              </div>

              {err && (
                <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-xs font-semibold text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{err}</span>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={busy || !membershipNum || !mobile}
                className="mt-2 h-12 w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 font-display text-sm font-extrabold text-white shadow-md shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 transition-all"
              >
                {busy ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Verifying details…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    View Verification History <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Membership Status Card */}
            <div className="grid gap-6 sm:grid-cols-[1fr_220px] items-center rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-6 text-white shadow-xl">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-amber-400">
                      PennyGrade Member Card
                    </span>
                    <h2 className="mt-1 font-display text-2xl font-extrabold text-white">
                      {data.member.full_name}
                    </h2>
                    <p className="mt-0.5 font-mono text-xs tracking-widest text-amber-300">
                      {maskId(data.member.membership_number)}
                    </p>
                  </div>
                  <StatusBadge status={data.member.status} />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-xs">
                  <div>
                    <p className="text-slate-400">Membership Plan</p>
                    <p className="font-bold text-white">{data.member.plan_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400">Valid Until</p>
                    <p className="font-bold text-amber-400">{fmtDate(data.member.expiry_date)}</p>
                  </div>
                </div>

                {totalSaved > 0 && (
                  <div className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3.5 text-center">
                    <span className="text-xs font-semibold text-amber-300">Total Lifetime Savings: </span>
                    <span className="font-display text-lg font-black text-white">{inr(totalSaved)}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center">
                <PhysicalCardPreview code={maskId(data.member.membership_number)} interactive={false} className="w-full shadow-lg" />
              </div>
            </div>

            {/* Verifications List */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display text-base font-extrabold text-navy">
                  <HistoryIcon className="h-5 w-5 text-gold" />
                  Past Verifications ({data.history.length})
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setData(null)}
                  className="text-xs font-bold text-muted-foreground hover:text-navy"
                >
                  Lookup Another Card
                </Button>
              </div>

              {data.history.length === 0 ? (
                <EmptyState title="No verification activity recorded yet.">
                  <p className="text-xs text-muted-foreground">
                    Visit any partner outlet, scan their counter QR standee and present your verified screen to start saving!
                  </p>
                  <Button asChild size="sm" className="mt-4 rounded-[8px] bg-gold font-bold text-accent-foreground hover:bg-gold-soft">
                    <Link to="/partners">Browse Partner Outlets</Link>
                  </Button>
                </EmptyState>
              ) : (
                <div className="space-y-3">
                  {data.history.map((h) => (
                    <div
                      key={h.id}
                      className="overflow-hidden rounded-[12px] border border-[#ececf1] bg-white p-5 shadow-sm transition hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-display text-sm font-bold text-navy">{h.partner_name}</p>
                          <p className="text-xs text-muted-foreground">{h.offer_title}</p>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-extrabold text-emerald-700">
                          Saved {inr(h.discount_amount)}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-[#ececf1] pt-3 text-xs">
                        <div className="flex gap-4">
                          <div>
                            <span className="text-muted-foreground">Bill: </span>
                            <span className="font-bold text-navy">{inr(h.bill_amount)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Final: </span>
                            <span className="font-extrabold text-navy">{inr(h.final_amount)}</span>
                          </div>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {fmtDateTime(h.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
