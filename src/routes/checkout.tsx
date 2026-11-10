import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Truck,
  Sparkles,
  MapPin,
  HelpCircle,
  AlertCircle,
  LoaderCircle,
} from "lucide-react";
import { SiteLayout } from "@/components/site";
import { LOGO_URL, Wordmark, PhysicalCardPreview } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getPublicMembershipPlans,
  createMembershipOrder,
  verifyPaymentAndFulfillOrder,
} from "@/lib/orders.functions";
import { type PublicPlan } from "@/lib/orders.logic";
import { inr } from "@/lib/format";
import { buildPageHead, buildBreadcrumbSchema } from "@/lib/seo";
import { recordVerifiedOrderForNavigation } from "@/lib/order-confirmation";
import { setMembershipCardInCart } from "@/lib/product-cart";
import {
  isPaymentLocked,
  needsPaymentBlockingOverlay,
  shouldReleasePaymentLockOnGatewayDismiss,
  type PaymentPhase,
} from "@/lib/payment-lifecycle";
import {
  PaymentProcessingIndicator,
  PaymentProcessingOverlay,
} from "@/components/payment-processing-indicator";

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

interface RazorpayPaymentSuccess {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  modal: { ondismiss: () => void };
  handler: (response: RazorpayPaymentSuccess) => Promise<void>;
}

interface RazorpayCheckoutInstance {
  on: (
    event: "payment.failed",
    callback: (response: { error?: { description?: string } }) => void,
  ) => void;
  open: () => void;
}

interface CheckoutOrderResponse {
  ok: boolean;
  orderId: string;
  orderNumber: string;
  razorpayOrderId: string;
  razorpayKeyId: string;
  amount: number;
  currency: string;
}

export const Route = createFileRoute("/checkout")({
  loader: async () => ({ plans: await getPublicMembershipPlans() }),
  validateSearch: (search: Record<string, unknown>) => ({
    planId: typeof search.planId === "string" ? search.planId : undefined,
  }),
  head: () =>
    buildPageHead({
      title: "Checkout | Order PennyGrade Physical Membership Card",
      description:
        "Purchase the PennyGrade six-month physical membership card online for delivery in Daltonganj, Jharkhand. Partner benefits and offer conditions vary by listing.",
      path: "/checkout",
      jsonLd: buildBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Buy Your Card", path: "/checkout" },
        { name: "Checkout", path: "/checkout" },
      ]),
    }),
  component: CheckoutPage,
});

let razorpayScriptPromise: Promise<boolean> | null = null;

function loadRazorpayScript(): Promise<boolean> {
  // Local QA must never load the live Razorpay checkout script.
  if (import.meta.env.MODE === "local-qa" || !import.meta.env.VITE_RAZORPAY_KEY_ID?.trim()) {
    return Promise.resolve(false);
  }
  if (razorpayScriptPromise) return razorpayScriptPromise;
  razorpayScriptPromise = new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => {
      script.remove();
      resolve(false);
    };
    document.body.appendChild(script);
  });
  void razorpayScriptPromise.then((loaded) => {
    if (!loaded) razorpayScriptPromise = null;
  });
  return razorpayScriptPromise;
}

function CheckoutPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { plans } = Route.useLoaderData();
  const [selectedPlanId, setSelectedPlanId] = useState<string>(search.planId || plans[0]?.id || "");

  const createOrderFn = useServerFn(createMembershipOrder);
  const verifyPaymentFn = useServerFn(verifyPaymentAndFulfillOrder);

  // Customer Personal Details
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");

  // Delivery Address Details
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city] = useState("Daltonganj");
  const [state] = useState("Jharkhand");
  const [pincode, setPincode] = useState("822101");
  const [country, setCountry] = useState("India");

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [paymentPhase, setPaymentPhase] = useState<PaymentPhase>("idle");
  const [paymentStatusText, setPaymentStatusText] = useState("");
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState<{
    fingerprint: string;
    order: CheckoutOrderResponse;
  } | null>(null);
  const [gatewayError, setGatewayError] = useState("");
  const [retryDelay, setRetryDelay] = useState(0);
  const [networkFailureCount, setNetworkFailureCount] = useState(0);
  const checkoutInProgressRef = useRef(false);
  const paymentPhaseRef = useRef<PaymentPhase>("idle");

  const setCurrentPaymentPhase = (phase: PaymentPhase) => {
    paymentPhaseRef.current = phase;
    setPaymentPhase(phase);
  };
  const checkoutLocked = isPaymentLocked(paymentPhase);

  const stopProcessing = () => {
    checkoutInProgressRef.current = false;
    setCurrentPaymentPhase("idle");
    setPaymentStatusText("");
  };

  useEffect(() => {
    if (retryDelay <= 0) return;
    const timer = window.setTimeout(
      () => setRetryDelay((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [retryDelay]);

  useEffect(() => {
    loadRazorpayScript().then(setRazorpayReady);
  }, []);

  useEffect(() => {
    if (search.planId && plans.some((plan) => plan.id === search.planId)) {
      setSelectedPlanId(search.planId);
    } else if (!plans.some((plan) => plan.id === selectedPlanId)) {
      setSelectedPlanId(plans[0]?.id || "");
    }
  }, [plans, search.planId, selectedPlanId]);

  const safePlans = Array.isArray(plans) ? plans : [];
  const selectedPlan = safePlans.find((p) => p.id === selectedPlanId) || safePlans[0] || null;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkoutInProgressRef.current || retryDelay > 0) return;
    if (!selectedPlan) {
      toast.error("The active membership plan could not be confirmed. Please try again later.");
      return;
    }

    if (!fullName.trim() || fullName.trim().length < 2) {
      toast.error("Please enter your full name (minimum 2 characters)");
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error("Please enter a valid email address for order confirmation");
      return;
    }
    const cleanMobile = mobile.replace(/\D/g, "");
    if (cleanMobile.length < 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    if (!line1.trim() || line1.trim().length < 3) {
      toast.error("Please enter your house/flat number and street");
      return;
    }
    if (!city.trim()) {
      toast.error("Please enter your delivery city");
      return;
    }
    if (!state.trim()) {
      toast.error("Please enter your delivery state");
      return;
    }
    if (!/^\d{6}$/.test(pincode.trim())) {
      toast.error("Please enter a valid 6-digit Indian PIN code");
      return;
    }
    if (!termsAccepted) {
      toast.error("Please accept the terms and conditions and privacy policy to continue");
      return;
    }

    checkoutInProgressRef.current = true;
    setCurrentPaymentPhase("initializing");
    setGatewayError("");
    setPaymentStatusText("Initializing secure payment session…");

    try {
      const checkoutData = {
        planId: selectedPlan.id,
        fullName: fullName.trim(),
        email: cleanEmail,
        mobile: cleanMobile,
        deliveryAddress: {
          line1: line1.trim(),
          line2: line2.trim() || null,
          landmark: landmark.trim() || null,
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          country: country.trim() || "India",
        },
        termsAccepted: true,
      };
      const fingerprint = JSON.stringify(checkoutData);
      const orderRes =
        pendingCheckout?.fingerprint === fingerprint
          ? pendingCheckout.order
          : await createOrderFn({ data: checkoutData });

      if (!orderRes.ok || !orderRes.orderId) {
        throw new Error("Could not initialize order. Please try again.");
      }
      setNetworkFailureCount(0);
      setRetryDelay(0);
      setGatewayError("");
      if (pendingCheckout?.fingerprint !== fingerprint) {
        setPendingCheckout({ fingerprint, order: orderRes });
      }

      setPaymentStatusText("Opening Razorpay payment gateway…");

      if (!orderRes.razorpayKeyId || !orderRes.razorpayOrderId) {
        throw new Error("Razorpay is not configured correctly. Please contact support.");
      }
      const scriptLoaded = razorpayReady || (await loadRazorpayScript());
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Razorpay Checkout could not load. Check your connection and try again.");
      }

      // 2. Open Razorpay Checkout modal
      const options: RazorpayCheckoutOptions = {
        key: orderRes.razorpayKeyId,
        order_id: orderRes.razorpayOrderId,
        amount: Math.round(orderRes.amount * 100),
        currency: orderRes.currency,
        name: "PennyGrade",
        description: selectedPlan.name,
        image: LOGO_URL,
        prefill: {
          name: fullName.trim(),
          email: cleanEmail,
          contact: cleanMobile,
        },
        theme: {
          color: "#0f172a",
        },
        modal: {
          ondismiss: () => {
            // Razorpay may emit ondismiss once its success handler takes over.
            // That is not a customer cancellation; verification must stay locked.
            if (!shouldReleasePaymentLockOnGatewayDismiss(paymentPhaseRef.current)) return;
            stopProcessing();
            toast.info("Payment window closed. Your order remains pending.");
          },
        },
        handler: async (response: RazorpayPaymentSuccess) => {
          if (
            !response.razorpay_payment_id ||
            !response.razorpay_order_id ||
            !response.razorpay_signature
          ) {
            toast.error(
              "Razorpay returned incomplete payment details. Please retry or contact support.",
            );
            stopProcessing();
            return;
          }
          setCurrentPaymentPhase("verifying");
          setPaymentStatusText("Verifying captured payment and checking card allocation…");
          try {
            const fulfillRes = await verifyPaymentFn({
              data: {
                orderId: orderRes.orderId,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature,
              },
            });

            if (fulfillRes.ok) {
              setMembershipCardInCart(null);
              setPendingCheckout(null);
              recordVerifiedOrderForNavigation({
                orderNumber: orderRes.orderNumber,
                paymentStatus: "CAPTURED",
                cardStatus: fulfillRes.cardAssigned ? "ALLOCATED" : "FULFILLMENT_EXCEPTION",
                emailStatus: fulfillRes.emailStatus || "PENDING",
              });
              stopProcessing();
              toast.success(fulfillRes.cardAssigned
                ? "Payment captured and a physical card was allocated to your order."
                : "Payment captured; card allocation is pending support resolution.");
              navigate({
                to: "/order-confirmation/$orderNumber",
                params: { orderNumber: orderRes.orderNumber },
              });
            } else {
              if (fulfillRes.pending)
                toast.info(fulfillRes.message || "Payment is still processing.");
              else toast.error(fulfillRes.message || "Payment verification failed.");
              stopProcessing();
            }
          } catch (err: unknown) {
            toast.error(
              err instanceof Error ? err.message : "Payment verification encountered an issue.",
            );
            stopProcessing();
          }
        },
      };

      // Check if Razorpay script loaded
      if (typeof window !== "undefined" && window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (resp) => {
          stopProcessing();
          toast.error(
            resp.error?.description || "Payment failed. Please try a different payment method.",
          );
        });
        setCurrentPaymentPhase("gateway");
        rzp.open();
      } else {
        toast.error("Razorpay Checkout failed to load. Please check your network and try again.");
        stopProcessing();
      }
    } catch (err: unknown) {
      console.error("[Checkout] Error:", err);
      let message =
        err instanceof Error ? err.message : "Could not complete checkout. Please try again.";
      if (
        message.toLowerCase().includes("<!doctype") ||
        message.toLowerCase().includes("<html") ||
        message.toLowerCase().includes("<head") ||
        message.toLowerCase().includes("<title>") ||
        /<[a-z!][\s\S]*>/i.test(message)
      ) {
        message = "Server is temporarily unavailable. Please refresh and try again.";
      } else if (/Authentication failed/i.test(message)) {
        message = "Payment gateway authentication failed. Please verify Razorpay API keys in settings.";
      }
      const gatewayUnavailable = /Razorpay did not respond|Could not connect to Razorpay/i.test(
        message,
      );
      if (gatewayUnavailable) {
        setRetryDelay(Math.min(15 * 2 ** networkFailureCount, 120));
        setNetworkFailureCount((count) => count + 1);
        setGatewayError(message);
      }
      // The inline checkout alert already persists this gateway outage and retry
      // countdown. Avoid showing the same failure again in a transient toast.
      if (!gatewayUnavailable) toast.error(message);
      stopProcessing();
    }
  };

  return (
    <SiteLayout>
      {needsPaymentBlockingOverlay(paymentPhase) && (
        <PaymentProcessingOverlay
          message={paymentStatusText || "Preparing your secure payment session…"}
        />
      )}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50 px-3.5 py-1 text-xs font-bold text-amber-900 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            <span>Secure Membership Card Checkout</span>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Order Your Physical Card Online
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">
            Enter your delivery details for the PennyGrade six-month physical membership card.
            Browse participating partners and check each listing for its current offer terms.
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-xs font-semibold text-amber-800">
            Card delivery is currently available only in Daltonganj, Jharkhand.
          </p>
        </div>

        <form
          onSubmit={handleCheckout}
          aria-busy={checkoutLocked}
          inert={checkoutLocked || undefined}
          className={checkoutLocked ? "pointer-events-none" : undefined}
        >
          <div className="grid gap-10 lg:grid-cols-12">
            {/* Left 7 Columns: Personal & Delivery Information */}
            <div className="space-y-8 lg:col-span-7">
              {/* Step 1: Membership Plan Selection */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                      1
                    </span>
                    <h2 className="text-base font-bold text-slate-900">Select Membership Plan</h2>
                  </div>
                  <span className="text-xs font-bold text-emerald-600">Physical Card Included</span>
                </div>

                <div className="mt-4 space-y-3">
                  {safePlans.map((p) => {
                    const isSelected = p.id === selectedPlanId;
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          if (!checkoutLocked) setSelectedPlanId(p.id);
                        }}
                        aria-disabled={checkoutLocked}
                        className={`${checkoutLocked ? "cursor-not-allowed" : "cursor-pointer"} rounded-xl border p-4 transition-all ${
                          isSelected
                            ? "border-amber-400 bg-amber-50/50 ring-2 ring-amber-400/30"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900">{p.name}</div>
                            <div className="text-xs text-slate-500">
                              {p.duration_days} Days Full Validity (6 Months)
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-extrabold text-slate-900">
                              {inr(p.price)}
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                              Free Delivery
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {safePlans.length === 0 && (
                    <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                      The active six-month physical-card plan is unavailable. Checkout is disabled until PennyGrade's current plan and price can be verified.
                    </p>
                  )}
                </div>
              </div>

              {/* Step 2: Personal Information */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                    2
                  </span>
                  <h2 className="text-base font-bold text-slate-900">Personal Information</h2>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <Label htmlFor="fullName" className="text-xs font-bold text-slate-700">
                      Full Name (as printed on your membership){" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="fullName"
                      placeholder="e.g. Samir Pandey"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="mt-1.5 h-11 rounded-xl border-slate-200 focus-visible:ring-amber-400"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="email" className="text-xs font-bold text-slate-700">
                        Email Address (for order & redemption receipts){" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="mt-1.5 h-11 rounded-xl border-slate-200 focus-visible:ring-amber-400"
                      />
                    </div>
                    <div>
                      <Label htmlFor="mobile" className="text-xs font-bold text-slate-700">
                        10-Digit Mobile Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="mobile"
                        type="tel"
                        maxLength={10}
                        placeholder="e.g. 9876543210"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                        required
                        className="mt-1.5 h-11 rounded-xl border-slate-200 focus-visible:ring-amber-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Physical Card Delivery Address */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                      3
                    </span>
                    <h2 className="text-base font-bold text-slate-900">
                      Physical Card Delivery Address
                    </h2>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                    <Truck className="h-3.5 w-3.5 text-amber-500" /> Free Shipping
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <Label htmlFor="line1" className="text-xs font-bold text-slate-700">
                      House / Flat No., Apartment / Building Name, Street{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="line1"
                      placeholder="e.g. Flat 302, Royal Residency, Main Road"
                      value={line1}
                      onChange={(e) => setLine1(e.target.value)}
                      required
                      className="mt-1.5 h-11 rounded-xl border-slate-200 focus-visible:ring-amber-400"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="line2" className="text-xs font-bold text-slate-700">
                        Locality / Area
                      </Label>
                      <Input
                        id="line2"
                        placeholder="e.g. Redma Chowk, Station Road"
                        value={line2}
                        onChange={(e) => setLine2(e.target.value)}
                        className="mt-1.5 h-11 rounded-xl border-slate-200 focus-visible:ring-amber-400"
                      />
                    </div>
                    <div>
                      <Label htmlFor="landmark" className="text-xs font-bold text-slate-700">
                        Nearby Landmark (Optional)
                      </Label>
                      <Input
                        id="landmark"
                        placeholder="e.g. Near City Hospital"
                        value={landmark}
                        onChange={(e) => setLandmark(e.target.value)}
                        className="mt-1.5 h-11 rounded-xl border-slate-200 focus-visible:ring-amber-400"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <Label htmlFor="city" className="text-xs font-bold text-slate-700">
                        City <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="city"
                        value={city}
                        readOnly
                        required
                        className="mt-1.5 h-11 rounded-xl border-slate-200 focus-visible:ring-amber-400"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state" className="text-xs font-bold text-slate-700">
                        State <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="state"
                        value={state}
                        readOnly
                        required
                        className="mt-1.5 h-11 rounded-xl border-slate-200 focus-visible:ring-amber-400"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pincode" className="text-xs font-bold text-slate-700">
                        PIN Code <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="pincode"
                        maxLength={6}
                        placeholder="822101"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                        required
                        className="mt-1.5 h-11 rounded-xl border-slate-200 focus-visible:ring-amber-400 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Order Review & Razorpay Checkout */}
            <div className="space-y-6 lg:col-span-5">
              <div className="sticky top-28 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
                <h3 className="border-b border-slate-100 pb-4 text-base font-bold text-slate-900">
                  Order Summary
                </h3>

                {/* Physical Card Visual */}
                <div className="my-5">
                  <PhysicalCardPreview className="w-full shadow-lg" interactive={false} />
                  <div className="mt-2.5 text-center text-xs font-medium text-slate-500">
                    Personalised physical membership card
                  </div>
                </div>

                {/* Plan Highlights */}
                <div className="space-y-2 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600">
                  <div className="font-bold text-slate-900">{selectedPlan?.name || "Plan unavailable"}</div>
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Valid for 180 days from activation</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Member privileges at participating partners, subject to each listing's terms</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Delivery in Daltonganj, Jharkhand</span>
                  </div>
                </div>

                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
                  No standard dispatch or delivery estimate is currently published. Please contact PennyGrade before paying to confirm the current fulfilment estimate.{" "}
                  <a href="/shipping-policy" target="_blank" rel="noopener noreferrer" className="font-semibold underline">Shipping policy</a>
                </p>

                {/* Pricing Table */}
                <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-4 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Membership Fee</span>
                    <span>{selectedPlan ? inr(selectedPlan.price) : "—"}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Physical Card Packaging & Courier</span>
                    <span className="font-bold text-emerald-600">FREE</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-extrabold text-slate-900">
                    <span>Total Payable</span>
                    <span className="text-xl text-amber-600">{selectedPlan ? inr(selectedPlan.price) : "—"}</span>
                  </div>
                </div>

                {/* Terms Agreement Checkbox */}
                <div className="mt-6 flex items-start space-x-2.5 rounded-xl border border-slate-200 bg-amber-50/40 p-3.5">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                  />
                  <label
                    htmlFor="terms"
                    className="text-xs leading-relaxed text-slate-700 cursor-pointer"
                  >
                    I agree to the{" "}
                    <a
                      href="/membership-terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-amber-800 underline"
                    >
                      Membership Terms
                    </a>{" "}
                    and{" "}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-amber-800 underline"
                    >
                      Privacy Policy
                    </a>{" "}
                    and the{" "}
                    <a href="/refund-policy" target="_blank" rel="noopener noreferrer" className="font-bold text-amber-800 underline">Refund &amp; Cancellation Policy</a>{" "}
                    and{" "}
                    <a href="/shipping-policy" target="_blank" rel="noopener noreferrer" className="font-bold text-amber-800 underline">Shipping Policy</a>.
                    I consent to sharing the information needed for payment processing with the payment provider and the delivery details needed with the fulfilment provider. I confirm my delivery details are accurate.
                  </label>
                </div>

                {/* Status Indicator */}
                {paymentStatusText && <PaymentProcessingIndicator message={paymentStatusText} />}

                {gatewayError && (
                  <div
                    role="alert"
                    className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800"
                  >
                    <p className="font-semibold">Razorpay is temporarily unreachable.</p>
                    <p className="mt-1">{gatewayError}</p>
                    {retryDelay > 0 && <p className="mt-1">Retry available in {retryDelay}s.</p>}
                  </div>
                )}

                {/* Pay Now Button */}
                <Button
                  type="submit"
                  disabled={!selectedPlan || checkoutLocked || retryDelay > 0}
                  className="mt-6 w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 font-extrabold text-white shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 transition-all text-sm cursor-pointer disabled:cursor-not-allowed"
                  aria-busy={checkoutLocked}
                >
                  {checkoutLocked ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
                      {paymentPhase === "gateway" ? "Payment window open…" : "Processing Payment…"}
                    </span>
                  ) : retryDelay > 0 ? (
                    `Retry in ${retryDelay}s`
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" /> {selectedPlan ? `Pay ${inr(selectedPlan.price)} with Razorpay` : "Membership plan unavailable"}
                    </>
                  )}
                </Button>

                <div className="mt-4 flex items-center justify-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> 256-Bit SSL Encrypted
                  </span>
                  <span>•</span>
                  <span>UPI, Cards & NetBanking</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </SiteLayout>
  );
}
