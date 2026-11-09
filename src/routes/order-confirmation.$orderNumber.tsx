import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Truck, ArrowRight, Mail } from "lucide-react";
import { SiteLayout } from "@/components/site";
import { PhysicalCardPreview } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { consumeVerifiedOrderForNavigation, type VerifiedOrderHandoff } from "@/lib/order-confirmation";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/order-confirmation/$orderNumber")({
  head: () =>
    buildPageHead({
      title: "Order Status | PennyGrade Membership Card",
      description: "Check the verified status of your PennyGrade physical membership card order.",
      path: "/order-confirmation",
    }),
  component: OrderConfirmationPage,
});

function OrderConfirmationPage() {
  const { orderNumber } = useParams({ from: "/order-confirmation/$orderNumber" });
  const [confirmation, setConfirmation] = useState<VerifiedOrderHandoff | null>(null);
  const consumedOrderRef = useRef<string | null>(null);

  useEffect(() => {
    // React Strict Mode replays effects in development; consume the one-time handoff once.
    if (consumedOrderRef.current === orderNumber) return;
    consumedOrderRef.current = orderNumber;
    setConfirmation(consumeVerifiedOrderForNavigation(orderNumber));
  }, [orderNumber]);

  return (
    <SiteLayout>
      {!confirmation ? (
        <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg sm:p-12">
            <h1 className="text-2xl font-extrabold text-slate-900">Check your order status</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
              Payment and card allocation cannot be confirmed from an order number in the URL. Look up the order using the email address or mobile number provided at checkout.
            </p>
            <p className="mt-5 font-mono text-sm font-semibold text-slate-700">ORDER: {orderNumber}</p>
            <Button asChild className="mt-7 rounded-xl bg-amber-600 font-bold text-white hover:bg-amber-500">
              <Link to="/track-order" search={{ orderNumber }}>Track this order</Link>
            </Button>
          </div>
        </div>
      ) : (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Success Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-6 py-10 text-center text-white sm:px-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 ring-4 ring-emerald-500/30">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            </div>
            <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">
              Payment Captured
            </h1>
            <p className="mt-1.5 text-sm text-slate-300">
              Thank you for ordering your PennyGrade physical membership card.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-800/80 px-4 py-1 text-xs font-mono font-bold tracking-wider text-amber-300 border border-amber-400/30">
              <span>ORDER:</span>
              <span>{orderNumber}</span>
            </div>
          </div>

          {/* Card Showcase & Delivery Status */}
          <div className="p-6 sm:p-10 space-y-8">
            <div className="grid gap-8 sm:grid-cols-2 items-center">
              <div>
                <PhysicalCardPreview className="shadow-lg" interactive={false} />
              </div>

              <div className="space-y-3">
                <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${confirmation.cardStatus === "ALLOCATED" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-900 border-amber-200"}`}>
                  <span className={`h-2 w-2 rounded-full ${confirmation.cardStatus === "ALLOCATED" ? "bg-emerald-500" : "bg-amber-500"}`} />
                  <span>{confirmation.cardStatus === "ALLOCATED" ? "Physical card allocated" : "Card allocation pending"}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {confirmation.cardStatus === "ALLOCATED" ? "Your card is being prepared" : "Support must resolve your card allocation"}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {confirmation.cardStatus === "ALLOCATED"
                    ? "A physical card has been allocated to this order. Track this page for dispatch updates."
                    : "Payment was captured, but inventory was unavailable and no physical card was allocated. Contact support with your order number for a fulfilment or refund resolution."}
                </p>
                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700 border border-slate-200">
                  <div className="font-semibold text-slate-900">Validity: 180 Days (6 Months)</div>
                  <div className="text-slate-500 mt-0.5">Membership validity begins after successful payment verification.</div>
                </div>
              </div>
            </div>

            {/* Email Confirmation Notice */}
              <div className={`flex items-start gap-3.5 rounded-2xl border p-4 text-xs ${confirmation.emailStatus === "SENT" ? "border-blue-200 bg-blue-50/60 text-blue-900" : confirmation.emailStatus === "FAILED" ? "border-amber-200 bg-amber-50 text-amber-950" : "border-slate-200 bg-slate-50 text-slate-800"}`}>
              <Mail className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                {confirmation.emailStatus === "SENT" ? (
                  <><span className="font-bold">Confirmation email submitted:</span> The mail provider accepted the receipt request for processing.</>
                ) : confirmation.emailStatus === "FAILED" ? (
                  <><span className="font-bold">Confirmation email not sent:</span> Payment is captured; contact support if you need a receipt.</>
                ) : (
                  <><span className="font-bold">Confirmation email pending:</span> Check order tracking later or contact support if it does not arrive.</>
                )}
              </div>
            </div>

            {/* Next Steps */}
            <div className="border-t border-slate-100 pt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                What Happens Next?
              </h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-xs text-slate-600">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-800">
                    1
                  </div>
                  <div>
                    <strong className="text-slate-900">Dispatch Notification:</strong> When your card is handed to our courier, you'll receive an email with your courier name and tracking code.
                  </div>
                </div>
                <div className="flex items-start gap-3 text-xs text-slate-600">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-800">
                    2
                  </div>
                  <div>
                    <strong className="text-slate-900">Member benefits:</strong> Browse participating businesses and check each listing for its current offer and conditions. Pay the business directly for purchases there.
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
              <Button asChild className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 font-bold text-white shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 h-11">
                <Link to="/track-order" search={{ orderNumber }}>
                  <Truck className="h-4 w-4 mr-2" /> Track Card Delivery
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1 rounded-xl border-slate-200 h-11">
                <Link to="/partners">
                  Explore Participating Partners <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
      )}
    </SiteLayout>
  );
}

