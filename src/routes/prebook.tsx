import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, CreditCard, ShieldCheck, Sparkles } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { inr } from "@/lib/format";
import { createPrebookingOrder, verifyPrebookingPayment } from "@/lib/prebooking.functions";
import { getPublicPrebookingCampaigns, type PrebookingCampaign } from "@/lib/public.functions";

type PaymentResponse = { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string };
type CheckoutOptions = { key: string; order_id: string; amount: number; currency: string; name: string; description: string; prefill: { name: string; email: string; contact: string }; theme: { color: string }; modal: { ondismiss: () => void }; handler: (response: PaymentResponse) => Promise<void> };
type CheckoutInstance = { open: () => void; on: (event: "payment.failed", callback: (res: { error?: { description?: string } }) => void) => void };

export const Route = createFileRoute("/prebook")({ validateSearch: (s: Record<string, unknown>) => ({ campaign: typeof s.campaign === "string" ? s.campaign : undefined, confirmed: typeof s.confirmed === "string" ? s.confirmed : undefined }), head: () => ({ meta: [{ title: "Prebook | PennyGrade" }, { name: "description", content: "Book an upcoming PennyGrade local membership campaign." }] }), component: PrebookPage });
let checkoutScriptPromise: Promise<boolean> | null = null;
function loadCheckoutScript() { if (typeof window === "undefined") return Promise.resolve(false); if (window.Razorpay) return Promise.resolve(true); if (!checkoutScriptPromise) checkoutScriptPromise = new Promise((resolve) => { const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js"; script.async = true; script.onload = () => resolve(Boolean(window.Razorpay)); script.onerror = () => { checkoutScriptPromise = null; resolve(false); }; document.body.appendChild(script); }); return checkoutScriptPromise; }

function PrebookPage() {
  const { campaign: selectedSlug, confirmed } = Route.useSearch();
  const navigate = useNavigate();
  const getCampaigns = useServerFn(getPublicPrebookingCampaigns); const createOrder = useServerFn(createPrebookingOrder); const verifyPayment = useServerFn(verifyPrebookingPayment);
  const [campaigns, setCampaigns] = useState<PrebookingCampaign[]>([]); const [selected, setSelected] = useState(""); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [mobile, setMobile] = useState(""); const [accepted, setAccepted] = useState(false); const [paidReservation, setPaidReservation] = useState(confirmed || "");
  useEffect(() => { getCampaigns().then(setCampaigns).catch(() => setError("Prebooking campaigns are temporarily unavailable.")).finally(() => setLoading(false)); }, [getCampaigns]);
  useEffect(() => { if (selectedSlug) { const found = campaigns.find((c) => c.slug === selectedSlug); if (found) setSelected(found.id); } else if (!selected && campaigns[0]) setSelected(campaigns[0].id); }, [campaigns, selectedSlug]);
  const campaign = useMemo(() => campaigns.find((c) => c.id === selected), [campaigns, selected]);
  const now = Date.now(); const opens = campaign ? Date.parse(campaign.booking_opens_at) : 0; const closes = campaign ? Date.parse(campaign.booking_closes_at) : 0; const bookingOpen = Boolean(campaign && campaign.status === "ACTIVE" && now >= opens && now < closes);
  const pay = async () => {
    setError(""); if (!campaign || !bookingOpen || !accepted) return;
    setBusy(true);
    try {
      const order = await createOrder({ data: { campaignId: campaign.id, fullName: name, email, mobile, acceptedTerms: true } });
      if (!order.razorpayKeyId) throw new Error("Online payment is not configured yet.");
      if (!(await loadCheckoutScript()) || !window.Razorpay) throw new Error("Razorpay Checkout could not load. Please retry.");
      const rzp = new window.Razorpay({ key: order.razorpayKeyId, order_id: order.razorpayOrderId, amount: Math.round(order.amount * 100), currency: order.currency, name: "PennyGrade", description: `Prebooking: ${order.campaignTitle}`, image: "/favicon.png", prefill: { name: order.customer.name, email: order.customer.email, contact: order.customer.mobile }, theme: { color: "#d99a2b" }, modal: { ondismiss: () => setBusy(false) }, handler: async (response) => {
        try { if (!response.razorpay_order_id || !response.razorpay_payment_id || !response.razorpay_signature) throw new Error("Payment details were incomplete."); const result = await verifyPayment({ data: { razorpayOrderId: response.razorpay_order_id, razorpayPaymentId: response.razorpay_payment_id, razorpaySignature: response.razorpay_signature } }); setPaidReservation(result.reservationNumber); await navigate({ to: "/prebook", search: { campaign: undefined, confirmed: result.reservationNumber } }); }
        catch (e) { setError(e instanceof Error ? e.message : "Payment confirmation is pending. Please contact support with your payment reference."); }
        finally { setBusy(false); }
      } });
      rzp.on("payment.failed", (res) => { setError(res.error?.description || "Payment failed. You can retry booking."); setBusy(false); }); rzp.open();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not start payment."); setBusy(false); }
  };
  if (loading) return <SiteLayout><div className="mx-auto max-w-5xl px-4 py-20 text-center text-slate-500">Loading current campaigns…</div></SiteLayout>;
  return <SiteLayout><PageHero eyebrow="Early access" title="Prebook upcoming" highlight="PennyGrade experiences"><p>Choose a current campaign, review exactly what it includes and its terms, then pay securely through Razorpay to reserve.</p></PageHero>
    <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1.05fr_.95fr] sm:px-6">
      <div className="space-y-4">{error && <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">Campaign details could not be loaded right now. Please try again later.</div>}{campaigns.length === 0 && !error ? <div className="rounded-3xl border border-dashed p-8 text-center text-slate-600"><Sparkles className="mx-auto mb-3 h-8 w-8 text-amber-500"/><h2 className="font-bold text-slate-900">No prebooking campaign is open yet</h2><p className="mt-2 text-sm">The next campaign will appear here after its details and booking dates are published.</p></div> : campaigns.map((item) => { const live = Date.now() >= Date.parse(item.booking_opens_at) && Date.now() < Date.parse(item.booking_closes_at); return <button key={item.id} onClick={() => setSelected(item.id)} className={`w-full rounded-3xl border p-5 text-left transition ${item.id === selected ? "border-amber-400 bg-amber-50 shadow-md" : "border-slate-200 bg-white hover:border-amber-300"}`}><div className="flex items-start justify-between gap-4"><div><span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600"><Sparkles className="h-3 w-3"/>{live ? "Booking open" : Date.now() < Date.parse(item.booking_opens_at) ? "Coming soon" : "Booking closed"}</span><h2 className="mt-3 text-lg font-extrabold text-slate-900">{item.title}</h2><p className="mt-1 text-sm leading-relaxed text-slate-600">{item.summary}</p></div><span className="whitespace-nowrap text-lg font-black text-slate-900">{inr(Number(item.amount))}</span></div></button>; })}</div>
      {campaign ? <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="flex items-start justify-between gap-4"><h2 className="text-2xl font-black text-slate-900">{campaign.title}</h2><span className="whitespace-nowrap rounded-full bg-amber-100 px-3 py-1 text-sm font-black text-amber-900">{inr(Number(campaign.amount))}</span></div><p className="mt-3 text-sm leading-6 text-slate-600">{campaign.description}</p>
        <div className="mt-5 grid gap-2 rounded-2xl bg-slate-50 p-4 text-xs text-slate-600"><p className="flex gap-2"><CalendarDays className="h-4 w-4 shrink-0 text-amber-600"/>Booking: {new Date(campaign.booking_opens_at).toLocaleString("en-IN")} – {new Date(campaign.booking_closes_at).toLocaleString("en-IN")}</p>{campaign.benefit_starts_at && <p className="flex gap-2"><Clock3 className="h-4 w-4 shrink-0 text-amber-600"/>Benefits begin {new Date(campaign.benefit_starts_at).toLocaleDateString("en-IN")}{campaign.benefit_ends_at ? ` and end ${new Date(campaign.benefit_ends_at).toLocaleDateString("en-IN")}` : ""}</p>}</div>
        {campaign.benefits.length > 0 && <div className="mt-5"><h3 className="font-bold text-slate-900">Included benefits</h3><ul className="mt-2 space-y-2">{campaign.benefits.map((b, i) => <li key={i} className="flex gap-2 text-sm text-slate-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"/>{b}</li>)}</ul></div>}
        <div className="mt-5 rounded-2xl border border-slate-200 p-4"><h3 className="flex items-center gap-2 font-bold text-slate-900"><ShieldCheck className="h-4 w-4 text-amber-600"/>Terms, cancellation & refunds</h3><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{campaign.terms_and_refunds}</p></div>
        <div className="mt-5 space-y-3"><div><Label htmlFor="prebook-name">Full name</Label><Input id="prebook-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></div><div><Label htmlFor="prebook-email">Email</Label><Input id="prebook-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div><div><Label htmlFor="prebook-mobile">Mobile</Label><Input id="prebook-mobile" type="tel" autoComplete="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} /></div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-700"><Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} className="mt-1"/><span>I have reviewed the campaign benefits, booking dates, and terms/refund policy above and agree to them.</span></label>
        {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
        <Button className="w-full bg-amber-400 font-bold text-slate-950 hover:bg-amber-300" disabled={busy || !bookingOpen || !accepted || name.trim().length < 2 || !email || !mobile} onClick={pay}><CreditCard className="mr-2 h-4 w-4"/>{busy ? "Opening secure checkout…" : bookingOpen ? `Pay ${inr(Number(campaign.amount))} and prebook` : "Booking is currently closed"}<ArrowRight className="ml-2 h-4 w-4"/></Button><p className="text-center text-[11px] text-slate-500">PennyGrade collects this campaign payment. Any separate merchant bill is paid directly to the merchant.</p></div>
      </div> : <div className="rounded-3xl bg-slate-50 p-8 text-center text-slate-500">{error ? "Campaign details are temporarily unavailable." : campaigns.length === 0 ? "No booking payment is due because no campaign is currently open." : "Select a campaign to see details."}</div>}
    </section>
    <Dialog open={Boolean(paidReservation)} onOpenChange={(v) => !v && setPaidReservation("")}><DialogContent><DialogHeader><DialogTitle>Prebooking payment confirmed</DialogTitle><DialogDescription>Your booking is recorded. Keep this reservation number for support.</DialogDescription></DialogHeader><div className="rounded-xl bg-emerald-50 p-4 text-center"><p className="text-xs font-semibold text-emerald-800">Reservation number</p><p className="mt-1 font-mono text-xl font-black text-emerald-950">{paidReservation}</p></div></DialogContent></Dialog>
  </SiteLayout>;
}
