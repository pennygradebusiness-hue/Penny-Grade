import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  MapPin,
  Clock,
  Phone,
  Mail,
  Globe,
  QrCode,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Crown,
  Heart,
  Share2,
  Calculator,
  ExternalLink,
  ChevronRight,
  BadgePercent,
  Check,
} from "lucide-react";
import { SiteLayout, Breadcrumbs } from "@/components/site";
import { EmptyState, CARD_URL } from "@/components/brand";
import { partnerQuery } from "@/lib/queries";
import { inr, formatDays, offerHeadline, offerSub, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import { buildPageHead, buildBreadcrumbSchema, buildLocalBusinessSchema } from "@/lib/seo";

export const Route = createFileRoute("/partners/$slug")({
  loader: async ({ context, params }) => {
    const p = await context.queryClient.ensureQueryData(partnerQuery(params.slug));
    if (!p) throw notFound();
    return {
      slug: p.slug,
      name: p.business_name,
      desc: p.description,
      img: p.cover_image_url,
      offer: p.offers[0] ? offerHeadline(p.offers[0]) : null,
      address: p.address,
      city: p.city,
      phone: p.phone,
      website: p.website,
      category_name: p.category?.name,
      latitude: p.latitude,
      longitude: p.longitude,
      business_hours: p.business_hours,
    };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Partner Not Found | PennyGrade" },
          { name: "robots", content: "noindex, nofollow" },
        ],
      };
    }
    const title = `${loaderData.name}${loaderData.offer ? ` — ${loaderData.offer}` : ""} | PennyGrade Partner`;
    const desc =
      loaderData.desc ||
      `Enjoy exclusive verified in-person member discounts at ${loaderData.name} in ${loaderData.city || "Daltonganj"} with PennyGrade.`;

    return buildPageHead({
      title,
      description: desc,
      path: `/partners/${params.slug}`,
      image: loaderData.img || undefined,
      type: "business.business",
      jsonLd: [
        buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Partners", path: "/partners" },
          { name: loaderData.name, path: `/partners/${params.slug}` },
        ]),
        buildLocalBusinessSchema({
          business_name: loaderData.name,
          slug: loaderData.slug || params.slug,
          description: loaderData.desc,
          cover_image_url: loaderData.img,
          address: loaderData.address,
          city: loaderData.city,
          phone: loaderData.phone,
          website: loaderData.website,
          category_name: loaderData.category_name,
          latitude: loaderData.latitude,
          longitude: loaderData.longitude,
          business_hours: loaderData.business_hours,
        }),
      ],
    });
  },
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-lg px-4 py-24">
        <EmptyState title="This PennyGrade partner could not be found.">
          <Link to="/partners" className="underline font-bold text-slate-900">
            Browse partner directory
          </Link>
        </EmptyState>
      </div>
    </SiteLayout>
  ),
  errorComponent: ({ reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h2 className="text-xl font-bold text-slate-900">Unable to load this partner</h2>
        <p className="mt-2 text-sm text-slate-600">
          We encountered an issue retrieving this partner's details.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 cursor-pointer"
          >
            Retry
          </button>
          <Link
            to="/partners"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            All Partners
          </Link>
        </div>
      </div>
    </SiteLayout>
  ),
  pendingComponent: () => (
    <SiteLayout>
      <div className="h-64 sm:h-80 animate-pulse bg-slate-200" />
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-8">
        <div className="h-10 w-1/3 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-48 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    </SiteLayout>
  ),
  component: PartnerPage,
});

function getCategoryCover(categoryName?: string | null) {
  const cat = (categoryName || "").toLowerCase();
  if (cat.includes("caf") || cat.includes("coffee") || cat.includes("bakery")) {
    return "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80";
  }
  if (cat.includes("rest") || cat.includes("din") || cat.includes("food")) {
    return "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80";
  }
  if (
    cat.includes("hotel") ||
    cat.includes("stay") ||
    cat.includes("resort") ||
    cat.includes("inn")
  ) {
    return "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80";
  }
  if (
    cat.includes("salon") ||
    cat.includes("spa") ||
    cat.includes("beauty") ||
    cat.includes("hair")
  ) {
    return "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80";
  }
  if (cat.includes("fit") || cat.includes("gym") || cat.includes("yoga")) {
    return "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80";
  }
  if (cat.includes("shop") || cat.includes("retail") || cat.includes("store")) {
    return "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80";
  }
  return "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80";
}

function PartnerPage() {
  const { slug } = Route.useParams();
  const { data: p } = useSuspenseQuery(partnerQuery(slug));
  const [isFav, setIsFav] = useState(false);
  const [calcBill, setCalcBill] = useState("1000");

  if (!p) return null;
  const offer = p.offers && p.offers.length > 0 ? p.offers[0] : null;
  const coverUrl = p.cover_image_url || getCategoryCover(p.category?.name);

  // Bill savings calculation
  const billAmount = Number(calcBill) || 0;
  let estimatedSavings = 0;
  if (offer && billAmount > 0) {
    if (offer.discount_type === "PERCENTAGE") {
      estimatedSavings = (billAmount * Number(offer.discount_value)) / 100;
      if (offer.max_discount != null) {
        estimatedSavings = Math.min(estimatedSavings, Number(offer.max_discount));
      }
    } else {
      estimatedSavings = Math.min(billAmount, Number(offer.discount_value));
    }
  }
  const estimatedPayable = Math.max(0, billAmount - estimatedSavings);
  const meetsMinBill = !offer || !offer.minimum_bill || billAmount >= Number(offer.minimum_bill);

  return (
    <SiteLayout>
      <div className="bg-[#f8fafc] pb-24 lg:pb-16">
        {/* ================================================================== */}
        {/* 1. STOREFRONT COVER BANNER                                         */}
        {/* ================================================================== */}
        <div className="relative h-64 sm:h-80 lg:h-96 w-full overflow-hidden bg-slate-950">
          <img
            src={coverUrl}
            alt={p.business_name}
            decoding="async"
            className="h-full w-full object-cover object-center brightness-90"
          />
          {/* Subtle Ambient Shadow */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-black/20" />

          {/* Top Overlays */}
          <div className="absolute top-4 left-4 right-4 mx-auto max-w-6xl flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-slate-900 shadow-md backdrop-blur-xs">
                {p.category?.name || "Partner Outlet"}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30 shadow-md backdrop-blur-xs">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Verified Partner</span>
              </span>
            </div>

            {/* Favorite button */}
            <button
              type="button"
              onClick={() => setIsFav(!isFav)}
              aria-label="Save to favorites"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md backdrop-blur-xs hover:bg-white hover:scale-105 transition-all cursor-pointer"
            >
              <Heart
                className={cn(
                  "h-5 w-5 transition-colors",
                  isFav ? "fill-red-500 text-red-500" : "text-slate-700",
                )}
              />
            </button>
          </div>
        </div>

        {/* ================================================================== */}
        {/* 2. ELEVATED IDENTITY CARD & HEADER ACTIONS                         */}
        {/* ================================================================== */}
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 -mt-16 sm:-mt-20 z-20">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xl shadow-slate-900/5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              {/* Left Identity: Avatar + Details */}
              <div className="flex items-start sm:items-center gap-4 sm:gap-5">
                {/* Logo / Monogram */}
                <div className="shrink-0">
                  {p.logo_url ? (
                    <img
                      src={p.logo_url}
                      alt={p.business_name}
                      width={96}
                      height={96}
                      decoding="async"
                      className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-4 border-white bg-white object-cover shadow-md ring-1 ring-slate-100"
                    />
                  ) : (
                    <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl border-4 border-white bg-slate-900 font-display text-3xl sm:text-4xl font-black text-amber-400 shadow-md ring-1 ring-slate-100">
                      {p.business_name[0]}
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="inline-block rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200/60">
                      {p.category?.name || "Privilege Outlet"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Active Member Benefits
                    </span>
                  </div>

                  <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                    {p.business_name}
                  </h1>

                  <div className="mt-1.5 flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-600 font-medium">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-[#c25e36] shrink-0" />
                      <span>{[p.address, p.city || "Daltonganj"].filter(Boolean).join(", ")}</span>
                    </span>
                    {p.latitude != null && p.longitude != null && (
                      <a
                        href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-[#c25e36] hover:underline"
                      >
                        <span>View Map</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Right CTA: Instant Counter Verification Button */}
              <div className="shrink-0 pt-2 sm:pt-0">
                <Link
                  to="/p/$partnerSlug"
                  params={{ partnerSlug: p.slug }}
                  className="w-full sm:w-auto inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-[#c25e36] px-7 text-sm font-extrabold text-white shadow-lg shadow-amber-500/25 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                >
                  <QrCode className="h-5 w-5" />
                  <span>Verify Discount at Counter</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        <div className="mx-auto max-w-6xl px-4 sm:px-6 mt-4">
          <Breadcrumbs
            items={[{ label: "Partners", to: "/partners" }, { label: p.business_name }]}
          />
        </div>

        {/* ================================================================== */}
        {/* 3. MAIN CONTENT GRID: ACTIONS & DETAILS                            */}
        {/* ================================================================== */}
        <div className="mx-auto max-w-6xl px-4 sm:px-6 mt-6">
          <div className="grid gap-8 lg:grid-cols-[1fr_390px] items-start">
            {/* -------------------------------------------------------------- */}
            {/* LEFT COLUMN: Redemption Guide, Overview & Info Cards           */}
            {/* -------------------------------------------------------------- */}
            <div className="space-y-6">
              {/* HOW TO REDEEM: Prominent 3-Step Counter Guide */}
              <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 p-6 sm:p-7 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-amber-400 shadow-sm">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      How to Save at {p.business_name}
                    </h2>
                    <p className="text-xs text-slate-600">
                      Simple 3-step billing counter redemption
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 font-display text-xs font-black text-amber-800 mb-2">
                      1
                    </span>
                    <strong className="block text-xs font-bold text-slate-900">
                      Tell the Cashier
                    </strong>
                    <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                      Mention that you are a PennyGrade member when requesting your bill.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 font-display text-xs font-black text-amber-800 mb-2">
                      2
                    </span>
                    <strong className="block text-xs font-bold text-slate-900">
                      Enter Bill & Card
                    </strong>
                    <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                      Tap "Verify Discount" or scan the counter standee to input your card and bill
                      total.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 font-display text-xs font-black text-emerald-800 mb-2">
                      3
                    </span>
                    <strong className="block text-xs font-bold text-slate-900">
                      Show Live Screen
                    </strong>
                    <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                      Show the running 5-min verification countdown. Staff applies the discount on
                      your POS.
                    </p>
                  </div>
                </div>
              </div>

              {/* ABOUT THIS PARTNER */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs">
                <h3 className="font-display text-lg font-bold text-slate-900">
                  About This Partner
                </h3>
                <p className="mt-3 text-xs sm:text-sm font-medium leading-relaxed text-slate-600">
                  {p.description ||
                    `${p.business_name} is an official verified PennyGrade partner outlet. Members enjoy guaranteed in-person discounts on every eligible visit throughout their 6-month card validity.`}
                </p>

                {/* Outlet Contact & Hours Grid */}
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {p.business_hours && (
                    <div className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <Clock className="h-4 w-4 text-[#c25e36] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 block">
                          Operating Hours
                        </span>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">
                          {p.business_hours}
                        </p>
                      </div>
                    </div>
                  )}

                  {p.phone && (
                    <a
                      href={`tel:${p.phone}`}
                      className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 hover:border-amber-300 transition-colors"
                    >
                      <Phone className="h-4 w-4 text-[#c25e36] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 block">
                          Contact Phone
                        </span>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{p.phone}</p>
                      </div>
                    </a>
                  )}

                  {p.email && (
                    <a
                      href={`mailto:${p.email}`}
                      className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 hover:border-amber-300 transition-colors"
                    >
                      <Mail className="h-4 w-4 text-[#c25e36] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 block">
                          Customer Email
                        </span>
                        <p className="text-xs font-bold text-slate-900 mt-0.5 truncate">
                          {p.email}
                        </p>
                      </div>
                    </a>
                  )}

                  {p.website && (
                    <a
                      href={p.website}
                      target="_blank"
                      rel="noreferrer"
                      className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 hover:border-amber-300 transition-colors"
                    >
                      <Globe className="h-4 w-4 text-[#c25e36] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 block">
                          Official Website
                        </span>
                        <p className="text-xs font-bold text-slate-900 mt-0.5 truncate flex items-center gap-1">
                          <span>Visit Website</span>
                          <ExternalLink className="h-3 w-3" />
                        </p>
                      </div>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* -------------------------------------------------------------- */}
            {/* RIGHT COLUMN: INTERACTIVE OFFER & INSTANT VERIFY HUB           */}
            {/* -------------------------------------------------------------- */}
            <aside className="space-y-6">
              {offer ? (
                <div className="rounded-3xl border-2 border-amber-400/80 bg-white shadow-xl shadow-amber-500/10 overflow-hidden">
                  {/* Offer Header Banner */}
                  <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 text-white relative">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300 border border-amber-400/30">
                        <Crown className="h-3 w-3" /> Member Privilege
                      </span>
                      <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> Unlimited Usage
                      </span>
                    </div>

                    <div className="mt-4">
                      <h3 className="font-display text-3xl sm:text-4xl font-black text-amber-400">
                        {offerHeadline(offer)}
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-slate-300">{offerSub(offer)}</p>
                    </div>
                  </div>

                  {/* Interactive Bill Savings Calculator */}
                  <div className="p-5 sm:p-6 border-b border-slate-100 bg-amber-50/40">
                    <div className="flex items-center gap-2 mb-2">
                      <Calculator className="h-4 w-4 text-[#c25e36]" />
                      <span className="text-xs font-bold text-slate-900">
                        Calculate Your Exact Savings
                      </span>
                    </div>

                    <div className="mt-2">
                      <div className="relative">
                        <span className="absolute left-3.5 top-2.5 font-bold text-slate-400 text-sm">
                          ₹
                        </span>
                        <input
                          type="number"
                          value={calcBill}
                          onChange={(e) => setCalcBill(e.target.value)}
                          placeholder="Enter bill amount"
                          className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-4 py-2 text-sm font-bold text-slate-900 outline-none focus:border-amber-400 shadow-2xs"
                        />
                      </div>

                      {/* Calculation Outcome */}
                      {billAmount > 0 && (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-white p-3 space-y-1.5 shadow-2xs">
                          <div className="flex justify-between text-xs text-slate-600">
                            <span>Total Bill:</span>
                            <span className="font-bold text-slate-900">{inr(billAmount)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-amber-800 font-bold">
                            <span>PennyGrade Discount:</span>
                            <span className="text-amber-600">-{inr(estimatedSavings)}</span>
                          </div>
                          <div className="border-t border-slate-100 pt-1.5 flex justify-between text-xs font-extrabold text-slate-900">
                            <span>You Pay Staff:</span>
                            <span className="text-emerald-700 font-display text-sm">
                              {inr(estimatedPayable)}
                            </span>
                          </div>
                        </div>
                      )}

                      {!meetsMinBill && (
                        <p className="mt-2 text-[11px] font-bold text-amber-700">
                          * Minimum bill of {inr(offer.minimum_bill)} required to unlock discount.
                        </p>
                      )}
                    </div>

                    {/* Prominent Verification Button right inside calculator */}
                    <Link
                      to="/p/$partnerSlug"
                      params={{ partnerSlug: p.slug }}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-[#c25e36] py-3 text-xs sm:text-sm font-extrabold text-white shadow-md shadow-amber-500/25 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                    >
                      <QrCode className="h-4 w-4" />
                      <span>Proceed to Counter Verification</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>

                  {/* Conditions Breakdown */}
                  <div className="p-5 sm:p-6 space-y-3 text-xs">
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500 font-medium">Offer Title</span>
                      <span className="font-bold text-slate-900 text-right">{offer.title}</span>
                    </div>

                    {offer.max_discount != null && (
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-slate-500 font-medium">Maximum Savings</span>
                        <span className="font-bold text-slate-900">{inr(offer.max_discount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500 font-medium">Minimum Bill</span>
                      <span className="font-bold text-slate-900">
                        {Number(offer.minimum_bill) > 0
                          ? inr(offer.minimum_bill)
                          : "No Minimum Bill"}
                      </span>
                    </div>

                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500 font-medium">Valid Days</span>
                      <span className="font-bold text-slate-900 text-right">
                        {formatDays(offer.valid_days)}
                      </span>
                    </div>

                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500 font-medium">Eligible Visits</span>
                      <span className="font-bold text-emerald-700">Unlimited (6 Months)</span>
                    </div>

                    {offer.terms_conditions && (
                      <div className="pt-2 text-[11px] text-slate-500">
                        <strong className="block text-slate-800 mb-0.5">Terms & Conditions:</strong>
                        <p>{offer.terms_conditions}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <EmptyState title="No active offers currently published for this partner." />
              )}

              {/* Direct Verification Callout Box */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-amber-400">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-display text-sm font-bold text-slate-900">
                      At the Billing Counter?
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Generate your live verification screen
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-slate-600">
                  Tap below to launch the live counter verification screen. Staff will deduct the
                  discount from your final bill.
                </p>

                <Link
                  to="/p/$partnerSlug"
                  params={{ partnerSlug: p.slug }}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-white py-2.5 text-xs font-extrabold text-slate-900 hover:bg-slate-900 hover:text-white transition-all cursor-pointer"
                >
                  <QrCode className="h-4 w-4" />
                  <span>Launch Verification Screen</span>
                </Link>
              </div>
            </aside>
          </div>
        </div>

        {/* ================================================================== */}
        {/* 4. MOBILE STICKY BOTTOM ACTION BAR                                 */}
        {/* ================================================================== */}
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md shadow-2xl">
          <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-base font-black text-[#c25e36]">
                  {offer ? offerHeadline(offer) : "New Partner"}
                </span>
                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 border border-amber-200/60">
                  Unlimited
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-semibold">
                Deduct directly at billing counter
              </p>
            </div>

            <Link
              to="/p/$partnerSlug"
              params={{ partnerSlug: p.slug }}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-[#c25e36] px-5 text-xs font-extrabold text-white shadow-md shadow-amber-500/30 active:scale-95 transition-all"
            >
              <QrCode className="h-4 w-4" />
              <span>Verify Now</span>
            </Link>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
