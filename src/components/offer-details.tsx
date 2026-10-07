import { inr, formatDays, offerHeadline, offerSub, fmtDate } from "@/lib/format";
import type { PublicOffer } from "@/lib/public.functions";

export function OfferPanel({ offer }: { offer: PublicOffer }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
      <div className="bg-navy px-6 py-6 text-navy-foreground">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Member offer</p>
        <p className="mt-2 font-display text-4xl font-bold text-gold">{offerHeadline(offer)}</p>
        <p className="text-navy-muted">{offerSub(offer)}</p>
      </div>
      <dl className="divide-y text-sm">
        <Row k="Offer" v={offer.title} />
        {offer.max_discount != null && <Row k="Maximum discount" v={inr(offer.max_discount)} />}
        <Row k="Minimum bill" v={Number(offer.minimum_bill) > 0 ? inr(offer.minimum_bill) : "None"} />
        <Row k="Valid days" v={formatDays(offer.valid_days)} />
        {offer.valid_until && <Row k="Valid until" v={fmtDate(offer.valid_until)} />}
        <Row k="Usage" v="Unlimited" />
      </dl>
      {offer.terms_conditions && <p className="border-t bg-muted/50 px-6 py-4 text-xs text-muted-foreground">{offer.terms_conditions}</p>}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 px-6 py-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}
