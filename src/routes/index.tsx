import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  MapPin,
  ArrowRight,
  Store,
  QrCode,
  CreditCard,
  Crown,
  Percent,
  Utensils,
  ShoppingBag,
  Sparkles,
  Gamepad2,
  CheckCircle2,
  Lightbulb,
  Building2,
  Users,
  Gift,
  HelpCircle,
  ExternalLink,
  ShoppingCart,
  Truck,
  CalendarDays,
  Compass,
  Tag,
} from "lucide-react";
import { SiteLayout, PartnerCard } from "@/components/site";
import { LOGO_URL, PhysicalCardPreview, cardWebp } from "@/components/brand";
import type { PublicPartner } from "@/lib/public.functions";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { categoriesQuery, partnersQuery, categoryIcon } from "@/lib/queries";
import {
  buildPageHead,
  buildOrganizationSchema,
  buildWebSiteSchema,
  buildFaqSchema,
} from "@/lib/seo";
import { getPublicStorefrontMembershipProduct } from "@/lib/orders.functions";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () =>
    buildPageHead({
      title: "Shop PennyGrade Membership Card | Local Member Privileges",
      description:
        "Shop the PennyGrade six-month physical membership card online. Explore participating local businesses and their listed member benefits in Daltonganj.",
      path: "/",
      jsonLd: [
        buildOrganizationSchema(),
        buildWebSiteSchema(),
        buildFaqSchema(FAQ.map((f) => ({ question: f.q, answer: f.a }))),
      ],
      links: [
        {
          rel: "preload",
          as: "image",
          href: cardWebp,
          type: "image/webp",
          fetchPriority: "high",
        },
      ],
    }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(partnersQuery),
      context.queryClient.ensureQueryData(categoriesQuery),
      getPublicStorefrontMembershipProduct(),
    ]),
  pendingComponent: () => (
    <SiteLayout hideFooterOnMobile>
      <div className="py-20 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
        <p className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Loading PennyGrade...
        </p>
      </div>
    </SiteLayout>
  ),
  component: Home,
});

const FAQ = [
  {
    q: "How do I redeem my discount at a partner business?",
    a: "When visiting any partner outlet, scan the permanent PennyGrade counter QR code. Enter your unique physical card number and the total bill amount. A live 5-minute cryptographic verification screen appears for the billing staff to verify and apply your discount.",
  },
  {
    q: "Do I need to download any mobile application?",
    a: "No! PennyGrade is 100% app-free and requires zero app store downloads. Everything functions seamlessly in your mobile browser with your physical card number.",
  },
  {
    q: "Can I use my membership discount multiple times?",
    a: "Redemption limits and eligibility depend on the active offer. Check that partner's listing and terms before ordering; the partner applies the benefit when you pay them directly.",
  },
  {
    q: "How does partner counter staff verify my discount?",
    a: "Staff do not need any login or scanner device. They simply glance at your phone's high-contrast live verification screen showing the active countdown timer, verified badge, and final payable amount.",
  },
  {
    q: "How can I check my past savings history?",
    a: "Visit the Check History page, enter your physical membership number and registered mobile number to see your savings history and visit audit trail.",
  },
  {
    q: "Can local businesses join PennyGrade as partners?",
    a: "Yes! Local restaurants, cafes, salons, fashion boutiques, gyms and lifestyle venues can join to attract high-intent repeat customers with zero POS software modification.",
  },
];

export default function Home() {
  const { data: partners } = useSuspenseQuery(partnersQuery);
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  const [, , product] = Route.useLoaderData();
  const featured = partners.slice(0, 6);

  return (
    <SiteLayout>
      <MobileHome partners={featured} productPrice={product?.plan.price ?? null} />
      <div className="block">
        {/* 1. HERO SECTION (Original PennyGrade branding with Bespoke 3D Card Showcase) */}
        <section className="hidden sm:block relative overflow-hidden bg-gradient-to-b from-white via-orange-50/30 to-white pb-8 pt-5 md:pb-20 md:pt-14">
          <div className="mx-auto grid max-w-6xl items-center gap-3 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            {/* Left Column: Copy & Actions */}
            <div>
              <h1 className="font-display text-[2.45rem] font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-[54px] leading-[1.02]">
                Discover Local Privileges{" "}
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600">
                  with One Membership Card.
                </span>
              </h1>

              <p className="mt-3 max-w-xl text-[15px] sm:mt-5 sm:text-lg font-medium leading-snug sm:leading-relaxed text-slate-600">
                Shop the PennyGrade six-month physical membership card online{product ? ` for ${inr(product.plan.price)}` : ""} and explore
                participating local businesses and their listed member privileges. Each partner
                applies eligible benefits under its own terms; customers pay partners directly.
              </p>

              {/* 4-column Hero Stats Strip (Real PennyGrade Details) */}
              <div className="my-5 grid grid-cols-4 gap-1 rounded-3xl bg-white p-3 shadow-card sm:my-7 sm:gap-5 sm:rounded-none sm:bg-transparent sm:p-0 sm:shadow-none">
                <div className="flex flex-col items-center gap-1 text-center sm:flex-row sm:gap-2.5 sm:text-left">
                  <Store className="h-6 w-6 text-amber-500 shrink-0" />
                  <div>
                    <strong className="block font-display text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                      Local
                    </strong>
                    <span className="text-[12px] font-bold text-slate-500">Partner Network</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1 text-center sm:flex-row sm:gap-2.5 sm:text-left">
                  <Percent className="h-6 w-6 text-amber-500 shrink-0" />
                  <div>
                    <strong className="block font-display text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                      Listed Offers
                    </strong>
                    <span className="text-[12px] font-bold text-slate-500">Terms vary by partner</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1 text-center sm:flex-row sm:gap-2.5 sm:text-left">
                  <Gift className="h-6 w-6 text-amber-500 shrink-0" />
                  <div>
                    <strong className="block font-display text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                      {product ? inr(product.plan.price) : "Price on product page"}
                    </strong>
                    <span className="text-[12px] font-bold text-slate-500">6-Month Pass</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1 text-center sm:flex-row sm:gap-2.5 sm:text-left">
                  <ShieldCheck className="h-6 w-6 text-amber-500 shrink-0" />
                  <div>
                    <strong className="block font-display text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                      100%
                    </strong>
                    <span className="text-[12px] font-bold text-slate-500">Online verification</span>
                  </div>
                </div>
              </div>

              {/* Dual CTA buttons */}
              <div className="hidden flex-wrap items-center gap-4 sm:flex">
                <Link
                  to="/membership-card"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-8 text-sm font-extrabold text-white shadow-lg shadow-amber-500/30 transition-all hover:from-amber-400 hover:to-amber-500 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5 active:translate-y-0"
                >
                  Shop Membership Card
                </Link>
                <Link
                  to="/partners"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl border-2 border-slate-900 bg-white px-8 text-sm font-extrabold text-slate-900 shadow-xs transition-all hover:bg-slate-900 hover:text-white hover:-translate-y-0.5 active:translate-y-0"
                >
                  View Businesses
                </Link>
              </div>
            </div>

            {/* Right Column: Custom 3D Physical Card Showcase with Ambient Orbit Rings */}
            <div className="relative flex min-h-[180px] items-center justify-center sm:min-h-[480px]">
              {/* Ambient Warm Golden Halo Glow */}
              <div className="absolute hidden h-[340px] w-[340px] rounded-full bg-gradient-to-tr from-amber-400/25 via-amber-200/20 to-orange-400/10 blur-3xl sm:block sm:h-[420px] sm:w-[420px]" />

              {/* Concentric Luxury Orbital Rings */}
              <div className="absolute hidden h-[320px] w-[320px] rounded-full border border-amber-300/40 bg-amber-50/50 sm:block sm:h-[400px] sm:w-[400px]" />
              <div className="absolute hidden h-[260px] w-[260px] rounded-full border border-dashed border-amber-400/30 sm:block sm:h-[330px] sm:w-[330px]" />

              {/* Centerpiece 3D Card Visual with Interactive Lift */}
              <div className="relative z-10 w-full max-w-[420px] transition-transform duration-300 hover:scale-[1.03] [&>div]:!rounded-2xl">
                <PhysicalCardPreview priority className="shadow-[0_25px_50px_-12px_rgba(245,158,11,0.25)] ring-2 ring-amber-400/50" />

                {/* Floating Glassmorphic Privilege Badges */}
                {/* Badge 1: Top Right - Discount Offer */}
                <div className="absolute -top-2 right-0 z-20 flex items-center gap-2 rounded-xl border border-amber-300/60 bg-white/95 px-2 py-1.5 shadow-xl shadow-amber-500/10 backdrop-blur-md sm:-top-4 sm:-right-4 sm:rounded-2xl sm:px-3.5 sm:py-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-xs">
                    <Percent className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-[11px] font-extrabold text-slate-900">
                      Partner offers
                    </span>
                    <span className="block text-[9px] font-semibold text-slate-500">
                      Dining & Retail
                    </span>
                  </div>
                </div>

                {/* Badge 2: Bottom Left - Zero App / Offline Ease */}
                <div className="absolute -bottom-2 left-0 z-20 flex items-center gap-2 rounded-xl border border-emerald-300/60 bg-white/95 px-2 py-1.5 shadow-xl shadow-emerald-500/10 backdrop-blur-md sm:-bottom-4 sm:-left-4 sm:rounded-2xl sm:px-3.5 sm:py-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-xs">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-[11px] font-extrabold text-slate-900">
                      Physical Membership Card
                    </span>
                    <span className="block text-[9px] font-semibold text-slate-500">
                      Online verification
                    </span>
                  </div>
                </div>

                {/* Badge 3: Center Bottom Mini Tag */}
                <div className="absolute -bottom-8 right-6 z-20 hidden sm:flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-bold text-amber-300 shadow-md">
                  <span>6-Month Membership</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. WHY CHOOSE PENNYGRADE? (6-Grid Oboroto Benefits in Warm Amber Palette) */}
        <section
          className="hidden sm:block border-t border-[#ececf1] bg-[#fafafc] py-14 sm:py-18"
          id="benefits"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-10 text-center">
              <h2 className="section-header-underline font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
                Why Choose PennyGrade?
              </h2>
              <p className="mt-4 text-xs font-semibold text-slate-500 sm:text-sm">
                Exclusive in-person savings and trusted local privileges for smart members.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
              {[
                {
                  icon: Percent,
                  title: "Exclusive Vouchers",
                  desc: "Review current partner offers and eligibility terms before visiting.",
                },
                {
                  icon: Utensils,
                  title: "Dining Savings",
                  desc: "Enjoy 10% to 30% off at top cafés, rooftop restaurants, and bistros.",
                },
                {
                  icon: ShoppingBag,
                  title: "Shopping Offers",
                  desc: "Save on branded fashion, ethnic wear, footwear, and lifestyle stores.",
                },
                {
                  icon: Sparkles,
                  title: "Wellness Benefits",
                  desc: "Special rates at luxury salons, spas, fitness gyms, and wellness centers.",
                },
                {
                  icon: Gamepad2,
                  title: "Entertainment",
                  desc: "Privileges at amusement parks, adventure zones, and stay vacations.",
                },
                {
                  icon: QrCode,
                  title: "QR Based Redemption",
                  desc: "Scan counter standee, verify instantly on your phone with live timer.",
                },
              ].map((b, i) => (
                <article
                  key={i}
                  className="flex flex-col items-center justify-start rounded-xl border border-slate-200 bg-white p-5 text-center shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-amber-400 hover:shadow-lift"
                >
                  <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-600">
                    <b.icon className="h-6 w-6 text-amber-500" />
                  </div>
                  <h3 className="font-display text-[15px] font-bold text-slate-900">{b.title}</h3>
                  <p className="mt-2 text-[12px] font-medium leading-relaxed text-slate-500">
                    {b.desc}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 3. HOW PENNYGRADE WORKS (Oboroto 8-Step Illustrated Flow) */}
        <section className="hidden sm:block bg-white py-16 sm:py-24" id="how-it-works">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-6 text-center sm:mb-14">
              <h2 className="section-header-underline font-display text-2xl font-extrabold text-slate-900 sm:text-4xl">
                How{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600">
                  PennyGrade
                </span>{" "}
                Works
              </h2>
              <p className="mt-4 text-sm font-semibold text-slate-500 sm:text-base">
                Explore local partners, review offer terms, and verify your active membership
              </p>
            </div>

            <div className="grid gap-2 sm:gap-5 md:grid-cols-2 [&>article]:min-h-0 [&>article]:gap-3 [&>article]:rounded-xl [&>article]:p-3 sm:[&>article]:min-h-[200px] sm:[&>article]:gap-5 sm:[&>article]:rounded-2xl sm:[&>article]:p-6 [&>article>div:first-of-type]:h-12 [&>article>div:first-of-type]:w-12 sm:[&>article>div:first-of-type]:h-20 sm:[&>article>div:first-of-type]:w-20">
              {/* Step 1 */}
              <article className="relative flex min-h-[200px] items-center gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition-all hover:border-amber-300 hover:shadow-lift">
                <span className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 font-display text-base font-extrabold text-white shadow-md shadow-amber-500/30 ring-4 ring-white">
                  1
                </span>
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600">
                  <CreditCard className="h-9 w-9" />
                </div>
                <div>
                  <h3 className="section-header-underline-left font-display text-lg font-bold text-slate-900">
                    Carry Your Physical Card
                  </h3>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-slate-600 sm:text-sm">
                    Receive your exclusive PennyGrade membership card featuring your private
                    cryptographic member number.
                  </p>
                </div>
              </article>

              {/* Step 2 */}
              <article className="relative flex min-h-[200px] items-center gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition-all hover:border-amber-300 hover:shadow-lift">
                <span className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 font-display text-base font-extrabold text-white shadow-md shadow-amber-500/30 ring-4 ring-white">
                  2
                </span>
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600">
                  <Store className="h-9 w-9" />
                </div>
                <div>
                  <h3 className="section-header-underline-left font-display text-lg font-bold text-slate-900">
                    Explore Partner Businesses
                  </h3>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-slate-600 sm:text-sm">
                    Browse verified restaurants, shopping outlets, salons, gyms, hotels and family
                    entertainment venues.
                  </p>
                </div>
              </article>

              {/* Step 3 */}
              <article className="relative flex min-h-[200px] items-center gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition-all hover:border-amber-300 hover:shadow-lift">
                <span className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 font-display text-base font-extrabold text-white shadow-md shadow-amber-500/30 ring-4 ring-white">
                  3
                </span>
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600">
                  <Building2 className="h-9 w-9" />
                </div>
                <div>
                  <h3 className="section-header-underline-left font-display text-lg font-bold text-slate-900">
                    Visit the Partner Outlet
                  </h3>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-slate-600 sm:text-sm">
                    Step in and enjoy dining, shopping, self-care or leisure with family and friends
                    at any partner location.
                  </p>
                </div>
              </article>

              {/* Step 4 */}
              <article className="relative flex min-h-[200px] items-center gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition-all hover:border-amber-300 hover:shadow-lift">
                <span className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 font-display text-base font-extrabold text-white shadow-md shadow-amber-500/30 ring-4 ring-white">
                  4
                </span>
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600">
                  <QrCode className="h-9 w-9" />
                </div>
                <div>
                  <h3 className="section-header-underline-left font-display text-lg font-bold text-slate-900">
                    Scan the Counter QR Standee
                  </h3>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-slate-600 sm:text-sm">
                    At billing time, simply scan the permanent PennyGrade QR standee displayed on
                    the billing counter.
                  </p>
                </div>
              </article>

              {/* Step 5 */}
              <article className="relative flex min-h-[200px] items-center gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition-all hover:border-amber-300 hover:shadow-lift">
                <span className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 font-display text-base font-extrabold text-white shadow-md shadow-amber-500/30 ring-4 ring-white">
                  5
                </span>
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600">
                  <CreditCard className="h-9 w-9" />
                </div>
                <div>
                  <h3 className="section-header-underline-left font-display text-lg font-bold text-slate-900">
                    Enter Card Number & Bill
                  </h3>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-slate-600 sm:text-sm">
                    Type your physical membership code and your total bill amount. No account
                    passwords or logins needed.
                  </p>
                </div>
              </article>

              {/* Step 6 */}
              <article className="relative flex min-h-[200px] items-center gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition-all hover:border-amber-300 hover:shadow-lift">
                <span className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 font-display text-base font-extrabold text-white shadow-md shadow-emerald-500/30 ring-4 ring-white">
                  6
                </span>
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-9 w-9" />
                </div>
                <div>
                  <h3 className="section-header-underline-left font-display text-lg font-bold text-slate-900">
                    Live Cryptographic Verification
                  </h3>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-slate-600 sm:text-sm">
                    Server verifies your membership, calculates eligible discount, and starts a live
                    5-minute verified session screen.
                  </p>
                </div>
              </article>

              {/* Step 7 */}
              <article className="relative flex min-h-[200px] items-center gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition-all hover:border-amber-300 hover:shadow-lift">
                <span className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 font-display text-base font-extrabold text-white shadow-md shadow-amber-500/30 ring-4 ring-white">
                  7
                </span>
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600">
                  <Percent className="h-9 w-9" />
                </div>
                <div>
                  <h3 className="section-header-underline-left font-display text-lg font-bold text-slate-900">
                    Staff Applies Your Discount
                  </h3>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-slate-600 sm:text-sm">
                    Staff glances at the live countdown screen and applies the verified discount to
                    your bill immediately.
                  </p>
                </div>
              </article>

              {/* Step 8 */}
              <article className="relative flex min-h-[200px] items-center gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition-all hover:border-amber-300 hover:shadow-lift">
                <span className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 font-display text-base font-extrabold text-white shadow-md shadow-amber-500/30 ring-4 ring-white">
                  8
                </span>
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600">
                  <Gift className="h-9 w-9" />
                </div>
                <div>
                  <h3 className="section-header-underline-left font-display text-lg font-bold text-slate-900">
                    Save & Repeat!
                  </h3>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-slate-600 sm:text-sm">
                    Pay the remaining discounted total using Cash, UPI, or Card. Enjoy unlimited
                    discount visits throughout your 6-month membership!
                  </p>
                </div>
              </article>
            </div>

            {/* Oboroto Merchant QR Alert Callout */}
            <aside className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-amber-50/60 to-white p-5 text-slate-800 shadow-xs sm:flex-row sm:px-8">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/25">
                  <Lightbulb className="h-6 w-6" />
                </div>
                <div>
                  <strong className="block text-sm font-extrabold text-slate-900">
                    Important:
                  </strong>
                  <p className="text-xs font-medium text-slate-600 sm:text-sm">
                    QR code is displayed at the merchant billing counter. No customer application
                    download or online registration required.
                  </p>
                </div>
              </div>
              <QrCode className="h-10 w-10 shrink-0 text-slate-400" />
            </aside>

            {/* Oboroto 4-grid Trust Banner */}
            <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-2xl bg-slate-900 text-white shadow-md sm:grid-cols-4">
              <div className="flex items-center justify-center gap-3 border-r border-white/10 p-4 text-center">
                <ShieldCheck className="h-6 w-6 text-amber-400" />
                <div className="text-left">
                  <strong className="block text-xs font-extrabold text-white">Verified</strong>
                  <span className="text-[11px] text-slate-400">Partner records</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 border-r border-white/10 p-4 text-center">
                <Percent className="h-6 w-6 text-amber-400" />
                <div className="text-left">
                  <strong className="block text-xs font-extrabold text-white">Partner-listed</strong>
                  <span className="text-[11px] text-slate-400">Benefits</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 border-r border-white/10 p-4 text-center">
                <QrCode className="h-6 w-6 text-amber-400" />
                <div className="text-left">
                  <strong className="block text-xs font-extrabold text-white">Server-side</strong>
                  <span className="text-[11px] text-slate-400">Offer verification</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 p-4 text-center">
                <Users className="h-6 w-6 text-amber-400" />
                <div className="text-left">
                  <strong className="block text-xs font-extrabold text-white">Zero App</strong>
                  <span className="text-[11px] text-slate-400">Hassle</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. MEMBERSHIP BAND (Oboroto Price Card + Includes + Art layout) */}
        <section className="hidden sm:block bg-slate-50/70 py-16 sm:py-20" id="membership">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-card lg:grid-cols-[280px_1fr_260px] lg:p-10">
              {/* Price Card (Solid Slate-Navy/Gold accent) */}
              <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-black p-6 text-white shadow-xl border border-slate-800">
                <div>
                  <Crown className="h-8 w-8 text-amber-400" />
                  <h3 className="mt-3 font-display text-2xl font-extrabold leading-tight text-white">
                    PennyGrade Membership
                  </h3>
                  <p className="mt-2 text-xs font-medium text-slate-400">
                    A physical membership connecting you with listed local partner benefits.
                  </p>
                </div>
                <div className="mt-6 border-t border-white/10 pt-4">
                  <span className="text-xs uppercase tracking-wider text-amber-400 font-bold">
                    6-Month Membership
                  </span>
                  <div className="font-display text-4xl font-extrabold text-white">{product ? inr(product.plan.price) : "Price unavailable"}</div>
                  <Link
                    to="/membership-card"
                    className="mt-4 inline-flex min-h-[42px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-xs font-bold text-white shadow-md shadow-amber-500/25 transition-all hover:from-amber-400 hover:to-amber-500 hover:shadow-lg hover:shadow-amber-500/35"
                  >
                    View Membership Card
                  </Link>
                </div>
              </div>

              {/* Membership Includes Checklist */}
              <div className="flex flex-col justify-between">
                <div>
                  <h3 className="font-display text-2xl font-extrabold text-slate-900">
                    Membership Includes
                  </h3>
                  <ul className="mt-6 grid grid-cols-1 gap-3.5 text-xs font-bold text-slate-800 sm:grid-cols-2">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>Personal physical membership card</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>Access to participating partner listings</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>Participating partner benefits</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>Partner terms shown before use</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>Live online membership verification</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>Member support by email and phone</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>Instant Live QR Redemption</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>Offer validity and limits vary</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 inline-flex flex-wrap items-center gap-4 rounded-full border border-amber-200 bg-amber-50 px-5 py-2.5 text-xs font-extrabold text-slate-900">
                  <span className="flex items-center gap-1.5 text-amber-700">
                    <ShieldCheck className="h-4 w-4 text-amber-600" /> Valid for 6 Months (180 Days)
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-700">Partner benefits may change</span>
                </div>
              </div>

              {/* Real Physical Card Visual in Membership Band */}
              <div className="hidden flex-col items-center justify-center rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/70 to-white p-4 text-center shadow-xs lg:flex">
                <PhysicalCardPreview className="w-full shadow-lg" interactive={false} />
                <div className="mt-3 flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
                  <Crown className="h-3.5 w-3.5 text-amber-500" />
                  <span>VIP Physical Member Pass</span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Unique membership number
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. STATS BAND (Oboroto Stats Strip) */}
        <section className="bg-white py-6">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-xs sm:gap-4 sm:p-6 lg:grid-cols-4 lg:p-8">
              <div className="flex min-w-0 items-center justify-center gap-2 text-center sm:gap-4 sm:text-left">
                <Users className="h-6 w-6 text-amber-500 shrink-0 sm:h-8 sm:w-8" />
                <div className="min-w-0">
                  <strong className="block break-words font-display text-xl font-extrabold text-slate-900 sm:text-2xl lg:text-3xl">
                    Explore
                  </strong>
                  <span className="block break-words text-[11px] font-bold text-slate-500 sm:text-xs">
                    Partner Businesses
                  </span>
                </div>
              </div>
              <div className="flex min-w-0 items-center justify-center gap-2 text-center sm:gap-4 sm:text-left">
                <MapPin className="h-6 w-6 text-amber-500 shrink-0 sm:h-8 sm:w-8" />
                <div className="min-w-0">
                  <strong className="block break-words font-display text-lg font-extrabold text-slate-900 sm:text-2xl lg:text-3xl">
                    Daltonganj
                  </strong>
                  <span className="block break-words text-[11px] font-bold text-slate-500 sm:text-xs">
                    Jharkhand only
                  </span>
                </div>
              </div>
              <div className="flex min-w-0 items-center justify-center gap-2 text-center sm:gap-4 sm:text-left">
                <Gift className="h-6 w-6 text-amber-500 shrink-0 sm:h-8 sm:w-8" />
                <div className="min-w-0">
                    <strong className="block break-words font-display text-lg font-extrabold text-slate-900 sm:text-2xl lg:text-3xl">
                    Check
                    </strong>
                  <span className="block break-words text-[11px] font-bold text-slate-500 sm:text-xs">
                    Offer conditions
                  </span>
                </div>
              </div>
              <div className="flex min-w-0 items-center justify-center gap-2 text-center sm:gap-4 sm:text-left">
                <ShieldCheck className="h-6 w-6 text-amber-500 shrink-0 sm:h-8 sm:w-8" />
                <div className="min-w-0">
                  <strong className="block break-words font-display text-lg font-extrabold text-slate-900 sm:text-2xl lg:text-3xl">
                    180 Days
                  </strong>
                  <span className="block break-words text-[11px] font-bold text-slate-500 sm:text-xs">
                    Membership validity
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. RECENTLY ADDED PARTNER BUSINESSES (Oboroto Catalog Grid) */}
        <section className="hidden sm:block bg-white py-16 sm:py-20" id="businesses">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h2 className="font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
                  Recently Added Partner Businesses
                </h2>
                <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">
                  Discover popular cafes, restaurants, fashion outlets and salons in your city.
                </p>
              </div>
              <Link
                to="/partners"
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-600 transition-colors hover:text-slate-900 sm:text-sm"
              >
                <span>View All Businesses</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 scrollbar-hide sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3 [&>*]:w-[82%] [&>*]:shrink-0 [&>*]:snap-center sm:[&>*]:w-auto sm:[&>*]:shrink">
              {featured.map((p) => (
                <PartnerCard key={p.id} p={p} />
              ))}
            </div>
          </div>
        </section>

        {/* 7. SPLIT PANELS: GROW YOUR BUSINESS + FAQ */}
        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Left Panel: Grow Your Business with PennyGrade */}
              <article className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-amber-400">
                      <Store className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                        For Retailers & Outlets
                      </span>
                      <h3 className="font-display text-2xl font-extrabold text-slate-900">
                        Grow Your Business with PennyGrade
                      </h3>
                    </div>
                  </div>

                  <p className="mt-4 text-xs font-medium leading-relaxed text-slate-600 sm:text-sm">
                    Partner with PennyGrade to publish an agreed member benefit and let local
                    customers discover your business. Listings go live after verification and a
                    signed benefit agreement.
                  </p>

                  <ul className="mt-6 grid grid-cols-2 gap-3 text-xs font-bold text-slate-800">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>Publish an agreed member benefit</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>Appear in local business discovery</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>Improve Repeat Business</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>Zero POS Integration</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>Server-side member verification</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>Targeted Local Promotion</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 border-t border-slate-200 pt-6">
                  <Link
                    to="/partner-with-us"
                    className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-slate-900 px-6 text-xs font-extrabold text-white shadow-sm transition-all hover:bg-slate-800"
                  >
                    Partner With Us <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </article>

              {/* Right Panel: FAQ Accordion */}
              <article
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8"
                id="faq"
              >
                <h3 className="font-display text-2xl font-extrabold text-slate-900">
                  Frequently Asked Questions
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Everything you need to know about PennyGrade membership.
                </p>

                <Accordion type="single" collapsible className="mt-6 space-y-2">
                  {FAQ.map((f, idx) => (
                    <AccordionItem
                      key={idx}
                      value={`faq-${idx}`}
                      className="rounded-xl border border-slate-200 px-4"
                    >
                      <AccordionTrigger className="text-left font-display text-xs font-bold text-slate-900 hover:text-amber-600 sm:text-sm">
                        {f.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-xs leading-relaxed text-slate-600 sm:text-sm">
                        {f.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </article>
            </div>
          </div>
        </section>

        {/* 9. READY TO START SAVING? PRE-FOOTER BANNER */}
        <section className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 py-14 text-white sm:py-16 border-t border-slate-800">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 px-4 text-center sm:px-6 md:flex-row md:text-left">
            <div className="flex items-center gap-6">
              <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/25 sm:flex">
                <CreditCard className="h-8 w-8" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-extrabold text-white sm:text-3xl">
                  Ready to Start Saving?
                </h2>
                <p className="mt-1.5 max-w-lg text-xs font-medium text-slate-400 sm:text-sm">
                  Join PennyGrade to discover participating local businesses and the member
                  benefits currently listed for each one.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/partners"
                className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-8 text-xs font-extrabold text-white shadow-lg shadow-amber-500/30 transition-all hover:from-amber-400 hover:to-amber-500 hover:-translate-y-0.5"
              >
                Explore Partners
              </Link>
              <Link
                to="/history"
                className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/20 bg-white/10 px-7 text-xs font-extrabold text-white transition-all hover:bg-white/15"
              >
                Check History
              </Link>
            </div>
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}

function MobileHome({ partners, productPrice }: { partners: PublicPartner[]; productPrice: number | null }) {
  const steps = [
    [ShoppingCart, "1. Buy", "Your Card"],
    [Truck, "2. Receive", "at Your Doorstep"],
    [Store, "3. Visit", "Partner Businesses"],
    [Tag, "4. Show Card", "& Save"],
  ] as const;
  return (
    <div className="mobile-home bg-white sm:hidden">
      <section className="bg-gradient-to-br from-white via-orange-50/50 to-white px-5 pb-5 pt-6">
        <div className="grid grid-cols-[1.12fr_.88fr] items-center gap-2">
          <div>
            <h1 className="text-[2rem] font-black leading-[.98] tracking-tight text-slate-950">
              Shop One Card.<span className="block text-orange-500">Discover Local Privileges.</span>
            </h1>
            <p className="mt-3 text-[13px] font-medium leading-[1.35] text-slate-800">
              Shop the six-month physical membership card online{productPrice !== null ? ` for ${inr(productPrice)}` : ""}. Explore participating
              businesses and their listed member benefits in Daltonganj.
            </p>
          </div>
          <PhysicalCardPreview interactive={false} className="rotate-[-5deg] shadow-xl" />
        </div>
        <div className="mt-4 grid grid-cols-4 divide-x divide-slate-300 rounded-[1.6rem] bg-white px-1 py-3 text-center shadow-[0_8px_24px_rgba(15,23,42,.1)]">
          {[
            [Store, "Local", "Partner Network"],
            [Percent, "Listed", "Partner Benefits"],
            [CalendarDays, "6-Month", "Membership"],
            [CreditCard, "100%", "Offline Card"],
          ].map(([Icon, value, detail]) => (
            <div key={String(detail)} className="flex flex-col items-center px-1 text-slate-900">
              <Icon className="mb-1 h-7 w-7 text-orange-500" />
              <strong className="text-[12px] font-black leading-tight">{String(value)}</strong>
              <span className="text-[11px] leading-tight">{String(detail)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-[1.2fr_1fr] gap-2.5 max-[360px]:grid-cols-1">
          <Link
            to="/membership-card"
            className="flex min-h-[56px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 text-center text-[14px] font-extrabold text-white shadow-lg"
          >
            <CreditCard className="h-6 w-6 shrink-0" />
            Shop Card{productPrice !== null ? ` – ${inr(productPrice)}` : ""} <ArrowRight className="h-4 w-4 shrink-0" />
          </Link>
          <Link
            to="/partners"
            className="flex min-h-[56px] items-center justify-center gap-2 rounded-full border-2 border-slate-900 px-2 text-center text-[13px] font-extrabold text-slate-900"
          >
            <Compass className="h-6 w-6 shrink-0" />
            Explore Businesses
          </Link>
        </div>
      </section>
      <section className="mx-5 rounded-[1.6rem] bg-gradient-to-br from-orange-50 to-white px-3 py-4 shadow-[0_8px_24px_rgba(15,23,42,.08)]">
        <h2 className="mb-3 text-center text-[21px] font-black tracking-tight text-slate-950">
          How It Works
        </h2>
        <div className="grid grid-cols-4 gap-1 text-center">
          {steps.map(([Icon, title, detail]) => (
            <div key={title} className="flex flex-col items-center">
              <span className="mb-1 grid h-14 w-14 place-items-center rounded-full bg-amber-100 text-orange-500">
                <Icon className="h-8 w-8" />
              </span>
              <strong className="text-[11px] font-extrabold leading-tight">{title}</strong>
              <span className="text-[11px] leading-tight">{detail}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between px-5">
          <h2 className="text-[21px] font-black tracking-tight text-slate-950">
            Popular Partner Businesses
          </h2>
          <Link to="/partners" className="shrink-0 text-sm font-extrabold text-orange-500">
            View All →
          </Link>
        </div>
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-3 scrollbar-hide">
          {partners.slice(0, 3).map((p) => (
            <div key={p.id} className="w-[72%] shrink-0 snap-center">
              <PartnerCard p={p} />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-center gap-2">
          <span className="h-3 w-3 rounded-full bg-orange-500" />
          <span className="h-3 w-3 rounded-full bg-orange-100" />
          <span className="h-3 w-3 rounded-full bg-orange-100" />
        </div>
      </section>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/15 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-2 py-2 text-white shadow-[0_-8px_30px_rgba(15,23,42,0.24)] sm:px-3">
        <div className="mx-auto flex max-w-md items-center justify-between gap-1 sm:gap-2">
          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
            <CreditCard className="h-7 w-7 shrink-0 text-orange-500 sm:h-8 sm:w-8" />
            <div>
              <p className="whitespace-nowrap text-[11px] font-extrabold sm:text-sm">
                Buy PennyGrade Card
              </p>
              <p className="whitespace-nowrap text-[10px] text-slate-300 sm:text-[11px]">
                {productPrice !== null ? `${inr(productPrice)} · ` : ""}6-Month Validity
              </p>
            </div>
          </div>
          <span className="h-10 w-px bg-white/30" />
          <Link
            to="/membership-card"
            className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2 text-[11px] font-extrabold text-white sm:min-h-10 sm:gap-2 sm:px-5 sm:text-sm"
          >
            Shop Card <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
