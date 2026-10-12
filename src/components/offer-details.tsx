import { inr, formatDays, offerHeadline, offerSub, fmtDate } from "@/lib/format";
import type { PublicOffer } from "@/lib/public.functions";
import { Crown, Sparkles, CheckCircle2 } from "lucide-react";

export function OfferPanel({ offer }: { offer: PublicOffer }) {
  return (
    <div className="overflow-hidden rounded-[12px] border border-[#ececf1] bg-white shadow-card">
      <div className="bg-navy px-6 py-6 text-white">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-gold">
            <Crown className="h-3 w-3" /> Member Privilege
          </span>
          <span className="text-[11px] font-bold text-gold">Unlimited Usage</span>
        </div>
        <p className="mt-3 font-display text-3xl font-extrabold text-gold sm:text-4xl">
          {offerHeadline(offer)}
        </p>
        <p className="mt-1 text-xs font-semibold text-navy-muted">{offerSub(offer)}</p>
      </div>

      <dl className="divide-y divide-[#ececf1] text-xs">
        <Row k="Offer Title" v={offer.title} />
        {offer.max_discount != null && <Row k="Maximum Savings" v={inr(offer.max_discount)} />}
        <Row
          k="Minimum Bill"
          v={Number(offer.minimum_bill) > 0 ? inr(offer.minimum_bill) : "No Minimum Bill"}
        />
        <Row k="Valid Days" v={formatDays(offer.valid_days)} />
        {offer.valid_until && <Row k="Valid Until" v={fmtDate(offer.valid_until)} />}
        <Row k="Usage Limit" v="Unlimited Eligible Visits" highlight />
      </dl>

      {offer.terms_conditions && (
        <div className="border-t border-[#ececf1] bg-[#fafafc] px-6 py-3.5 text-[11px] font-medium leading-relaxed text-muted-foreground">
          <strong className="block text-navy">Terms & Conditions:</strong>
          {offer.terms_conditions}
        </div>
      )}
    </div>
  );
}

function Row({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-3">
      <dt className="font-semibold text-muted-foreground">{k}</dt>
      <dd className={`text-right font-bold ${highlight ? "text-emerald-600" : "text-navy"}`}>
        {v}
      </dd>
    </div>
  );
}
