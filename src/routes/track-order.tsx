import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Truck,
  Package,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search,
  ExternalLink,
  MapPin,
  Calendar,
  AlertCircle,
  CreditCard,
} from "lucide-react";
import { SiteLayout } from "@/components/site";
import { Wordmark, PhysicalCardPreview } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inr } from "@/lib/format";
import { getOrderTrackingDetails } from "@/lib/orders.functions";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/track-order")({
  validateSearch: (search: Record<string, unknown>): { orderNumber?: string; email?: string } => ({
    orderNumber: typeof search?.orderNumber === "string" ? search.orderNumber : undefined,
    email: typeof search?.email === "string" ? search.email : undefined,
  }),
  head: () =>
    buildPageHead({
      title: "Track Order | PennyGrade Physical Card Delivery",
      description: "Track the real-time preparation, dispatch, and delivery status of your PennyGrade membership card.",
      path: "/track-order",
    }),
  component: TrackOrderPage,
});

function TrackOrderPage() {
  const searchParams = useSearch({ from: "/track-order" });
  const trackFn = useServerFn(getOrderTrackingDetails);

  const [orderNumber, setOrderNumber] = useState(searchParams.orderNumber || "");
  const [verificationInput, setVerificationInput] = useState(searchParams.email || "");
  const [isLoading, setIsLoading] = useState(false);
  const [trackingData, setTrackingData] = useState<any>(null);

  useEffect(() => {
    if (searchParams.orderNumber && searchParams.email) {
      handleLookup(searchParams.orderNumber, searchParams.email);
    }
  }, []);

  const handleLookup = async (ordNum?: string, verif?: string) => {
    const oNum = (ordNum || orderNumber).trim();
    const vInput = (verif || verificationInput).trim();

    if (!oNum) {
      toast.error("Please enter your Order Number (e.g. ORD-XXXXXXXX)");
      return;
    }
    if (!vInput) {
      toast.error("Please enter your registered email address or mobile number");
      return;
    }

    setIsLoading(true);
    try {
      const res = await trackFn({
        data: {
          orderNumber: oNum,
          verificationMobileOrEmail: vInput,
        },
      });

      if (res.ok && res.order) {
        setTrackingData(res.order);
      } else {
        setTrackingData(null);
        toast.error(res.message || "No matching order found.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to lookup order tracking details.");
      setTrackingData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800">Delivered</span>;
      case "SHIPPED":
        return <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-extrabold text-blue-800">Dispatched & In Transit</span>;
      case "READY_TO_DISPATCH":
      case "PROCESSING":
        return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-800">Processing & Packing</span>;
      case "FULFILMENT_EXCEPTION":
        return <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-extrabold text-red-800">Awaiting Allocation</span>;
      default:
        return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700">{status}</span>;
    }
  };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50 px-3.5 py-1 text-xs font-bold text-amber-900 shadow-2xs">
            <Truck className="h-3.5 w-3.5 text-amber-600" />
            <span>Fulfilment Tracking</span>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Track Your Membership Card Delivery
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
            Check the real-time packing, dispatch, and courier delivery status of your official physical card.
          </p>
        </div>

        {/* Lookup Box */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookup();
            }}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="orderNumber" className="text-xs font-bold text-slate-700">
                  Order Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="orderNumber"
                  placeholder="e.g. ORD-7X4P92LM"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  required
                  className="mt-1.5 h-11 rounded-xl border-slate-200 focus-visible:ring-amber-400 font-mono uppercase"
                />
              </div>

              <div>
                <Label htmlFor="verification" className="text-xs font-bold text-slate-700">
                  Registered Email or 10-Digit Mobile <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="verification"
                  placeholder="e.g. samir@example.com or 9876543210"
                  value={verificationInput}
                  onChange={(e) => setVerificationInput(e.target.value)}
                  required
                  className="mt-1.5 h-11 rounded-xl border-slate-200 focus-visible:ring-amber-400"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Button
                type="submit"
                disabled={isLoading}
                className="h-11 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 font-bold text-white shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 cursor-pointer"
              >
                {isLoading ? (
                  "Verifying…"
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" /> Track Status
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Tracking Details View */}
        {trackingData && (
          <div className="mt-8 space-y-8 animate-in fade-in duration-300">
            {/* Summary Banner */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-extrabold text-slate-900">{trackingData.orderNumber}</span>
                    {getStatusBadge(trackingData.orderStatus)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Recipient: <strong className="text-slate-800">{trackingData.customerName}</strong> • {trackingData.planName}
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-xs text-slate-500">{trackingData.cardAllocated ? "Physical Card Allocated" : "Card Allocation"}</div>
                  <div className="font-mono text-sm font-extrabold text-amber-700">
                    {trackingData.cardAllocated ? trackingData.maskedCardNumber : trackingData.orderStatus === "FULFILMENT_EXCEPTION" ? "Pending support resolution" : "Pending"}
                  </div>
                </div>
              </div>

              {/* Courier Tracking Highlights if Dispatched */}
              {trackingData.courierName && (
                <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Truck className="h-6 w-6 text-blue-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-blue-900">
                          Shipped via {trackingData.courierName}
                        </div>
                        {trackingData.trackingNumber && (
                          <div className="text-xs text-blue-700 font-mono mt-0.5">
                            Tracking #: <strong>{trackingData.trackingNumber}</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {trackingData.trackingUrl && (
                      <a
                        href={trackingData.trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                      >
                        <span>Courier Tracking</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Destination */}
              <div className="mt-5 flex items-center gap-2 text-xs text-slate-600">
                <MapPin className="h-4 w-4 text-amber-500 shrink-0" />
                <span>
                  Delivery to: <strong>{trackingData.deliveryCity}, {trackingData.deliveryState} - {trackingData.deliveryPincode}</strong>
                </span>
              </div>
            </div>

            {/* Visual Fulfilment Timeline */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
              <h3 className="text-base font-bold text-slate-900 mb-6">Fulfilment Progress Timeline</h3>

              <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {trackingData.stages.map((st: any) => {
                  return (
                    <div key={st.id} className="relative">
                      {/* Node circle */}
                      <div
                        className={`absolute -left-6 sm:-left-8 flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full border-2 bg-white ${
                          st.completed
                            ? "border-emerald-500 text-emerald-600"
                            : "border-slate-300 text-slate-300"
                        }`}
                      >
                        {st.completed ? (
                          <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 fill-emerald-50 text-emerald-600" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-slate-300" />
                        )}
                      </div>

                      <div className="pl-2 sm:pl-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <h4
                            className={`text-sm font-bold ${
                              st.completed ? "text-slate-900" : "text-slate-400"
                            }`}
                          >
                            {st.label}
                          </h4>
                          {st.date && (
                            <span className="text-[11px] text-slate-400 font-medium">
                              {new Date(st.date).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                          {st.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
