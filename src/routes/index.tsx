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
} from "lucide-react";
import { SiteLayout, PartnerCard } from "@/components/site";
import { LOGO_URL, PhysicalCardPreview } from "@/components/brand";
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

export const Route = createFileRoute("/")({
  head: () =>
    buildPageHead({
      title: "PennyGrade | Physical Card Discount Membership & Partner Privileges",
      description:
        "Save more on dining, shopping, wellness and hotels with guaranteed in-person member discounts at verified local partner businesses in Daltonganj. ₹500 / 6 months.",
      path: "/",
      jsonLd: [
        buildOrganizationSchema(),
        buildWebSiteSchema(),
        buildFaqSchema(FAQ.map((f) => ({ question: f.q, answer: f.a }))),
      ],
    }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(partnersQuery),
      context.queryClient.ensureQueryData(categoriesQuery),
    ]),
  pendingComponent: () => (
    <SiteLayout>
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
    a: "Yes. PennyGrade partner discounts offer unlimited eligible redemptions. You can save on every eligible visit across all partner businesses during your 6-month membership.",
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
  const featured = partners.slice(0, 6);

  return (
    <SiteLayout>
      {/* 1. HERO SECTION (Original PennyGrade branding with Bespoke 3D Card Showcase) */}
      <section className="relative overflow-hidden bg-white pb-14 pt-8 md:pb-20 md:pt-14">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          {/* Left Column: Copy & Actions */}
          <div>

            <h1 className="font-display text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-[54px] leading-[1.06]">
              One Physical Card.{" "}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600">
                Uncapped Daily Savings.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base sm:text-lg font-medium leading-relaxed text-slate-600">
              Flash your physical PennyGrade card at 120+ top cafés, dining spots, salons, and
              retail outlets across Daltonganj. Enjoy guaranteed discounts directly on your bill —
              zero apps to download, zero logins, and unlimited 6-month access.
            </p>

            {/* 4-column Hero Stats Strip (Real PennyGrade Details) */}
            <div className="my-7 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5">
              <div className="flex items-center gap-2.5">
                <Store className="h-6 w-6 text-amber-500 shrink-0" />
                <div>
                  <strong className="block font-display text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                    120+
                  </strong>
                  <span className="text-[12px] font-bold text-slate-500">Partner Outlets</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin className="h-6 w-6 text-amber-500 shrink-0" />
                <div>
                  <strong className="block font-display text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                    Daltonganj
                  </strong>
                  <span className="text-[12px] font-bold text-slate-500">Palamu, Jharkhand</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Gift className="h-6 w-6 text-amber-500 shrink-0" />
                <div>
                  <strong className="block font-display text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                    ₹500
                  </strong>
                  <span className="text-[12px] font-bold text-slate-500">6-Month Pass</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-6 w-6 text-amber-500 shrink-0" />
                <div>
                  <strong className="block font-display text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                    100%
                  </strong>
                  <span className="text-[12px] font-bold text-slate-500">Offline & Private</span>
                </div>
              </div>
            </div>

            {/* Dual CTA buttons */}
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/partners"
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-8 text-sm font-extrabold text-white shadow-lg shadow-amber-500/30 transition-all hover:from-amber-400 hover:to-amber-500 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5 active:translate-y-0"
              >
                Become a Member
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
          <div className="relative flex min-h-[420px] sm:min-h-[480px] items-center justify-center">
            {/* Ambient Warm Golden Halo Glow */}
            <div className="absolute h-[340px] w-[340px] rounded-full bg-gradient-to-tr from-amber-400/25 via-amber-200/20 to-orange-400/10 blur-3xl sm:h-[420px] sm:w-[420px]" />

            {/* Concentric Luxury Orbital Rings */}
            <div className="absolute h-[320px] w-[320px] rounded-full border border-amber-300/40 bg-amber-50/50 sm:h-[400px] sm:w-[400px]" />
            <div className="absolute h-[260px] w-[260px] rounded-full border border-dashed border-amber-400/30 sm:h-[330px] sm:w-[330px]" />

            {/* Centerpiece 3D Card Visual with Interactive Lift */}
            <div className="relative z-10 w-full max-w-[420px] transition-transform duration-300 hover:scale-[1.03]">
              <PhysicalCardPreview className="shadow-[0_25px_50px_-12px_rgba(245,158,11,0.25)] ring-2 ring-amber-400/50" />

              {/* Floating Glassmorphic Privilege Badges */}
              {/* Badge 1: Top Right - Discount Offer */}
              <div className="absolute -top-4 -right-2 sm:-right-4 z-20 flex items-center gap-2 rounded-2xl border border-amber-300/60 bg-white/95 px-3.5 py-2 shadow-xl shadow-amber-500/10 backdrop-blur-md">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-xs">
                  <Percent className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-[11px] font-extrabold text-slate-900">
                    Up to 30% Off
                  </span>
                  <span className="block text-[9px] font-semibold text-slate-500">
                    Dining & Retail
                  </span>
                </div>
              </div>

              {/* Badge 2: Bottom Left - Zero App / Offline Ease */}
              <div className="absolute -bottom-4 -left-2 sm:-left-4 z-20 flex items-center gap-2 rounded-2xl border border-emerald-300/60 bg-white/95 px-3.5 py-2 shadow-xl shadow-emerald-500/10 backdrop-blur-md">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-xs">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-[11px] font-extrabold text-slate-900">
                    100% Offline Card
                  </span>
                  <span className="block text-[9px] font-semibold text-slate-500">
                    Zero App · Instant Scan
                  </span>
                </div>
              </div>

              {/* Badge 3: Center Bottom Mini Tag */}
              <div className="absolute -bottom-8 right-6 z-20 hidden sm:flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-bold text-amber-300 shadow-md">
                <span>6 Months Unlimited Visits</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. WHY CHOOSE PENNYGRADE? (6-Grid Oboroto Benefits in Warm Amber Palette) */}
      <section className="border-t border-[#ececf1] bg-[#fafafc] py-14 sm:py-18" id="benefits">
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
                desc: "Get guaranteed member discounts and seasonal voucher privileges.",
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
      <section className="bg-white py-16 sm:py-24" id="how-it-works">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-14 text-center">
            <h2 className="section-header-underline font-display text-3xl font-extrabold text-slate-900 sm:text-4xl">
              How{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600">
                PennyGrade
              </span>{" "}
              Works
            </h2>
            <p className="mt-4 text-sm font-semibold text-slate-500 sm:text-base">
              Simple steps to unlock guaranteed discounts at billing counters
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
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
                  At billing time, simply scan the permanent PennyGrade QR standee displayed on the
                  billing counter.
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
                <strong className="block text-sm font-extrabold text-slate-900">Important:</strong>
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
                <strong className="block text-xs font-extrabold text-white">Trusted</strong>
                <span className="text-[11px] text-slate-400">Partners</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 border-r border-white/10 p-4 text-center">
              <Percent className="h-6 w-6 text-amber-400" />
              <div className="text-left">
                <strong className="block text-xs font-extrabold text-white">Guaranteed</strong>
                <span className="text-[11px] text-slate-400">Discounts</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 border-r border-white/10 p-4 text-center">
              <QrCode className="h-6 w-6 text-amber-400" />
              <div className="text-left">
                <strong className="block text-xs font-extrabold text-white">100% Secure</strong>
                <span className="text-[11px] text-slate-400">Cryptographic</span>
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
      <section className="bg-slate-50/70 py-16 sm:py-20" id="membership">
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
                  More than a membership — it's your permanent local savings companion.
                </p>
              </div>
              <div className="mt-6 border-t border-white/10 pt-4">
                <span className="text-xs uppercase tracking-wider text-amber-400 font-bold">
                  6-Month Membership
                </span>
                <div className="font-display text-4xl font-extrabold text-white">₹500</div>
                <Link
                  to="/become-a-member"
                  className="mt-4 inline-flex min-h-[42px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-xs font-bold text-white shadow-md shadow-amber-500/25 transition-all hover:from-amber-400 hover:to-amber-500 hover:shadow-lg hover:shadow-amber-500/35"
                >
                  Apply For Card (₹500 / 6 Mo)
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
                    <span>Exclusive Physical Membership Card</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>Access to 120+ Partner Outlets</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>Dining & Rooftop Café Savings</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>Shopping & Fashion Discounts</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>Salon & Spa Privilege Rates</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>Hotels & Family Entertainment</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>Instant Live QR Redemption</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>Unlimited Usage on Every Visit</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 inline-flex flex-wrap items-center gap-4 rounded-full border border-amber-200 bg-amber-50 px-5 py-2.5 text-xs font-extrabold text-slate-900">
                <span className="flex items-center gap-1.5 text-amber-700">
                  <ShieldCheck className="h-4 w-4 text-amber-600" /> Valid for 6 Months (180 Days)
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-700">New Partners Added Regularly</span>
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
                Anti-counterfeit cryptographic member ID
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. STATS BAND (Oboroto Stats Strip) */}
      <section className="bg-white py-6">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-6 shadow-xs sm:grid-cols-4 sm:p-8">
            <div className="flex items-center justify-center gap-4 text-center sm:text-left">
              <Users className="h-8 w-8 text-amber-500 shrink-0" />
              <div>
                <strong className="block font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
                  120+
                </strong>
                <span className="text-xs font-bold text-slate-500">Partner Businesses</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 text-center sm:text-left">
              <MapPin className="h-8 w-8 text-amber-500 shrink-0" />
              <div>
                <strong className="block font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
                  Daltonganj
                </strong>
                <span className="text-xs font-bold text-slate-500">Palamu, Jharkhand</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 text-center sm:text-left">
              <Gift className="h-8 w-8 text-amber-500 shrink-0" />
              <div>
                <strong className="block font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
                  Unlimited
                </strong>
                <span className="text-xs font-bold text-slate-500">Eligible Usage</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 text-center sm:text-left">
              <ShieldCheck className="h-8 w-8 text-amber-500 shrink-0" />
              <div>
                <strong className="block font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
                  Thousands
                </strong>
                <span className="text-xs font-bold text-slate-500">Happy Members</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. RECENTLY ADDED PARTNER BUSINESSES (Oboroto Catalog Grid) */}
      <section className="bg-white py-16 sm:py-20" id="businesses">
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

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <PartnerCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      </section>

      {/* 7. WHAT PEOPLE SAY (Oboroto Testimonial Grid) */}
      <section className="border-t border-slate-200 bg-slate-50/70 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="section-header-underline font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
              What People Say
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <article className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-card hover:border-amber-300 transition-all">
              <div>
                <div className="text-amber-500 text-lg">★★★★★</div>
                <p className="mt-4 text-xs font-semibold leading-relaxed text-slate-800 sm:text-sm">
                  "Saved more than ₹1,200 in my first two weeks eating out with friends! PennyGrade
                  is my go-to membership card whenever I step out."
                </p>
              </div>
              <strong className="mt-6 block text-xs font-bold text-slate-500">
                — Rahul Singh (Member)
              </strong>
            </article>

            <article className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-card hover:border-amber-300 transition-all">
              <div>
                <div className="text-amber-500 text-lg">★★★★★</div>
                <p className="mt-4 text-xs font-semibold leading-relaxed text-slate-800 sm:text-sm">
                  "The live 5-minute counter verification is super smooth. No buggy apps to download
                  and the staff applies the discount instantly."
                </p>
              </div>
              <strong className="mt-6 block text-xs font-bold text-slate-500">
                — Neha Agarwal (Member)
              </strong>
            </article>

            <article className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-card hover:border-amber-300 transition-all">
              <div>
                <div className="text-amber-500 text-lg">★★★★★</div>
                <p className="mt-4 text-xs font-semibold leading-relaxed text-slate-800 sm:text-sm">
                  "As a café owner, PennyGrade has brought us high-value repeat customers without
                  any complex billing integration. Highly recommended!"
                </p>
              </div>
              <strong className="mt-6 block text-xs font-bold text-slate-500">
                — Amit Tiwari (Partner Business Owner)
              </strong>
            </article>
          </div>
        </div>
      </section>

      {/* 8. SPLIT PANELS: GROW YOUR BUSINESS + FAQ */}
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
                  Partner with PennyGrade to increase your daily footfall and attract verified
                  paying customers across Daltonganj and Palamu.
                </p>

                <ul className="mt-6 grid grid-cols-2 gap-3 text-xs font-bold text-slate-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>Increase Footfall</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>Attract New Customers</span>
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
                    <span>Verified Customer Network</span>
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
                Join thousands of smart shoppers and enjoy guaranteed discounts across your favorite
                places in the city.
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
    </SiteLayout>
  );
}
