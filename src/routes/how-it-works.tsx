import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Store,
  QrCode,
  CheckCircle2,
  Percent,
  Building2,
  ShieldCheck,
  Users,
  Smartphone,
  Sparkles,
  ArrowRight,
  Coffee,
  Utensils,
  Dumbbell,
  Plane,
  Film,
  HeartPulse,
  ShoppingBag,
  Search,
  BadgeCheck,
  Clock,
  ChevronRight,
  MapPin,
  Compass,
  Bookmark,
  User,
} from "lucide-react";
import { SiteLayout } from "@/components/site";
import { CARD_URL } from "@/components/brand";
import { cn } from "@/lib/utils";
import { buildPageHead, buildBreadcrumbSchema } from "@/lib/seo";

export const Route = createFileRoute("/how-it-works")({
  head: () =>
    buildPageHead({
      title: "How It Works | PennyGrade Physical Card Discounts",
      description:
        "Learn how PennyGrade works: obtain your physical card, scan the venue counter QR code, and enjoy instant verified discounts on your billing amount.",
      path: "/how-it-works",
      jsonLd: buildBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "How It Works", path: "/how-it-works" },
      ]),
    }),
  component: HowItWorks,
});

/* -------------------------------------------------------------------------- */
/*                                CATEGORIES DATA                             */
/* -------------------------------------------------------------------------- */

const ECOSYSTEM_CATEGORIES = [
  {
    name: "Restaurants",
    icon: Utensils,
    tagline: "Fine Dining & Bistros",
    savings: "Up to 25% OFF",
  },
  {
    name: "Cafés",
    icon: Coffee,
    tagline: "Artisan Coffee & Bakeries",
    savings: "Flat 15-20% OFF",
  },
  {
    name: "Hotels",
    icon: Building2,
    tagline: "Boutique Stays & Resorts",
    savings: "Exclusive Member Rates",
  },
  {
    name: "Shopping",
    icon: ShoppingBag,
    tagline: "Apparel & Lifestyle",
    savings: "Up to 20% OFF",
  },
  {
    name: "Fitness",
    icon: Dumbbell,
    tagline: "Gyms & Yoga Studios",
    savings: "Up to 30% Packages",
  },
  {
    name: "Travel",
    icon: Plane,
    tagline: "Car Rentals & Tours",
    savings: "Verified Concessions",
  },
  {
    name: "Entertainment",
    icon: Film,
    tagline: "Cinemas, Bowling & Games",
    savings: "Special Group Deals",
  },
  {
    name: "Healthcare",
    icon: HeartPulse,
    tagline: "Clinics, Labs & Diagnostics",
    savings: "10-20% on Tests & Care",
  },
];

const STEPS_DATA = [
  {
    num: "01",
    label: "Step 01 — Discover",
    title: "Find Your Next Favourite.",
    desc: "Explore participating restaurants, cafés, hotels, and other businesses offering PennyGrade member benefits across Daltonganj.",
    badge: "Directory & Live Offers",
  },
  {
    num: "02",
    label: "Step 02 — Enter Your Membership",
    title: "Your Membership. Your Benefits.",
    desc: "Visit a participating business, scan its permanent partner QR code, and enter your PennyGrade membership/card number.",
    badge: "Counter Standee QR",
  },
  {
    num: "03",
    label: "Step 03 — Verify Your Discount",
    title: "Know Your Savings.",
    desc: "Enter your bill amount to calculate the eligible discount. The server validates the membership and applicable offer.",
    badge: "Server-Side Calculation",
  },
  {
    num: "04",
    label: "Step 04 — Enjoy Your Benefits",
    title: "Show. Save. Enjoy.",
    desc: "Display the temporary verification screen to the business staff. The staff applies the discount manually to your final bill.",
    badge: "Live 5-Min Timer",
  },
];

/* -------------------------------------------------------------------------- */
/*                               MAIN COMPONENT                               */
/* -------------------------------------------------------------------------- */

function HowItWorks() {
  const [activeStep, setActiveStep] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(false);

  // References for step observation
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const step4Ref = useRef<HTMLDivElement>(null);

  // Reference for Section 3 Ecosystem
  const ecosystemRef = useRef<HTMLDivElement>(null);
  const [ecosystemInView, setEcosystemInView] = useState(false);

  // Reference for Section 4 Collage
  const collageRef = useRef<HTMLDivElement>(null);
  const [collageProgress, setCollageProgress] = useState(0);

  // Check reduced motion preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, []);

  // Synchronous, rock-solid scroll calculation for active step
  useEffect(() => {
    const handleScroll = () => {
      const steps = [step1Ref, step2Ref, step3Ref, step4Ref];
      const viewportCenter = window.innerHeight * 0.45;
      let closestStep = 1;
      let minDistance = Infinity;

      steps.forEach((ref, idx) => {
        if (ref.current) {
          const rect = ref.current.getBoundingClientRect();
          const stepCenter = rect.top + rect.height / 2;
          const dist = Math.abs(stepCenter - viewportCenter);
          if (dist < minDistance) {
            minDistance = dist;
            closestStep = idx + 1;
          }
        }
      });

      setActiveStep(closestStep);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Intersection Observer for Ecosystem Section
  useEffect(() => {
    if (!ecosystemRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEcosystemInView(true);
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(ecosystemRef.current);
    return () => observer.disconnect();
  }, []);

  // Scroll Progress calculation for Collage Section
  useEffect(() => {
    if (reducedMotion) {
      setCollageProgress(1);
      return;
    }

    const handleCollageScroll = () => {
      if (!collageRef.current) return;
      const rect = collageRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      const start = windowHeight;
      const end = -rect.height * 0.3;
      const current = rect.top;

      let progress = (start - current) / (start - end);
      progress = Math.max(0, Math.min(1, progress));
      setCollageProgress(progress);
    };

    window.addEventListener("scroll", handleCollageScroll, { passive: true });
    handleCollageScroll();
    return () => window.removeEventListener("scroll", handleCollageScroll);
  }, [reducedMotion]);

  const scrollToStep = (stepNumber: number) => {
    const refs = [step1Ref, step2Ref, step3Ref, step4Ref];
    const targetRef = refs[stepNumber - 1];
    if (targetRef?.current) {
      targetRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const currentStep = activeStep >= 1 && activeStep <= 4 ? activeStep : 1;

  return (
    <SiteLayout>
      {/* ==================================================================== */}
      {/* SECTION 1: HERO (Compact, Premium Editorial Introduction)            */}
      {/* ==================================================================== */}
      <section className="relative overflow-hidden bg-white pt-14 pb-8 sm:pt-18 sm:pb-10 border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-3xl">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 text-xs font-extrabold tracking-widest text-amber-600 uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>HOW PENNYGRADE WORKS</span>
            </div>

            {/* Headline */}
            <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl leading-[1.08]">
              One Membership.
              <span className="block text-slate-800">A World of Benefits.</span>
            </h1>

            {/* Description */}
            <p className="mt-4 text-base font-medium leading-relaxed text-slate-600 sm:text-lg">
              Discover exclusive offers, verify your membership, and enjoy benefits at participating
              businesses with PennyGrade.
            </p>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* SECTION 2: STICKY PHONE + SCROLL STORYTELLING                        */}
      {/* ==================================================================== */}
      <section className="relative bg-slate-50/70 border-b border-slate-200/80">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* Note: Grid parent without items-start so both columns stretch to full height */}
          <div className="relative lg:grid lg:grid-cols-12 lg:gap-10 xl:gap-14">
            {/* ---------------------------------------------------------------- */}
            {/* LEFT COLUMN: Scrollable Steps with Substantial Storytelling Height*/}
            {/* ---------------------------------------------------------------- */}
            <div className="lg:col-span-6 relative py-12 lg:py-20">
              {/* Continuous vertical line track */}
              <div className="hidden lg:block absolute left-3.5 top-24 bottom-24 w-[2px] bg-slate-200" />

              <div className="space-y-24 lg:space-y-0">
                {STEPS_DATA.map((step, idx) => {
                  const stepNum = idx + 1;
                  const isActive = currentStep === stepNum;
                  const stepRef = [step1Ref, step2Ref, step3Ref, step4Ref][idx];

                  return (
                    <div
                      key={step.num}
                      ref={stepRef}
                      data-step={stepNum}
                      onClick={() => scrollToStep(stepNum)}
                      className={cn(
                        "relative transition-all duration-300 cursor-pointer lg:pl-12 lg:min-h-[75vh] lg:flex lg:flex-col lg:justify-center",
                        isActive ? "opacity-100" : "opacity-45 hover:opacity-75",
                      )}
                    >
                      {/* Active Vertical Accent Bar on the timeline */}
                      <div
                        className={cn(
                          "hidden lg:block absolute left-3.5 top-0 bottom-0 w-[3px] -translate-x-[0.5px] transition-all duration-300 rounded-full",
                          isActive
                            ? "bg-amber-500 shadow-sm shadow-amber-500/50"
                            : "bg-transparent",
                        )}
                      />

                      {/* Step Number + Eyebrow */}
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "font-display text-sm font-extrabold tracking-tight transition-colors",
                            isActive ? "text-amber-600" : "text-slate-400",
                          )}
                        >
                          {step.num}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          {step.label}
                        </span>
                      </div>

                      {/* Heading */}
                      <h2
                        className={cn(
                          "mt-2 font-display text-2xl font-bold tracking-tight transition-colors sm:text-3xl",
                          isActive ? "text-slate-900" : "text-slate-600",
                        )}
                      >
                        {step.title}
                      </h2>

                      {/* Description */}
                      <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
                        {step.desc}
                      </p>

                      {/* Context Pill */}
                      <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-2xs self-start">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        <span>{step.badge}</span>
                      </div>

                      {/* Mobile Inline Phone Preview Indicator */}
                      <div className="mt-5 lg:hidden rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-600">
                          <Smartphone className="h-4 w-4" />
                          <span>Screen 0{stepNum} Active</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* RIGHT COLUMN: STICKY PHONE MOCKUP (Locked in viewport)           */}
            {/* ---------------------------------------------------------------- */}
            <div className="hidden lg:block lg:col-span-6 relative h-full">
              {/* Sticky Container: stays fixed in place for the whole parent height */}
              <div className="sticky top-20 xl:top-24 h-[calc(100vh-100px)] max-h-[640px] flex items-center justify-center">
                {/* Complete Smartphone Mockup Frame */}
                <div className="relative w-[285px] sm:w-[305px] h-[550px] sm:h-[575px] rounded-[48px] bg-slate-950 p-3 shadow-2xl ring-1 ring-slate-800 shadow-slate-900/35 flex flex-col select-none">
                  {/* Subtle outer metallic rim */}
                  <div className="pointer-events-none absolute inset-0 rounded-[48px] border-[2px] border-slate-700/60" />

                  {/* Volume / Power Button ridges */}
                  <div className="absolute -left-1 top-24 h-8 w-1 rounded-l-xs bg-slate-700" />
                  <div className="absolute -left-1 top-36 h-10 w-1 rounded-l-xs bg-slate-700" />
                  <div className="absolute -right-1 top-30 h-12 w-1 rounded-r-xs bg-slate-700" />

                  {/* Inner Phone Screen Frame */}
                  <div className="relative h-full w-full overflow-hidden rounded-[38px] bg-white border border-slate-900 flex flex-col">
                    {/* Status Bar + Dynamic Island */}
                    <div className="relative z-30 flex h-9 w-full items-center justify-between px-5 pt-1 bg-white text-slate-900">
                      <span className="text-[11px] font-bold tracking-tight">9:41</span>
                      <div className="flex h-4 w-20 items-center justify-center rounded-full bg-black">
                        <div className="h-2 w-2 rounded-full bg-slate-900 border border-slate-800" />
                      </div>
                      <div className="flex items-center gap-1 text-[10px]">
                        <span className="h-2 w-3 rounded-2xs border border-slate-900 bg-slate-900" />
                      </div>
                    </div>

                    {/* App Screen Content Viewport */}
                    <div className="relative flex-1 overflow-hidden bg-slate-50">
                      {/* ------------------------------------------------------ */}
                      {/* SCREEN 1: DISCOVER NEARBY (Oboroto/GiveX Reference)    */}
                      {/* ------------------------------------------------------ */}
                      <div
                        className={cn(
                          "absolute inset-0 flex flex-col bg-white transition-all duration-500 ease-out",
                          currentStep === 1
                            ? "opacity-100 translate-y-0 scale-100 z-20 pointer-events-auto"
                            : "opacity-0 translate-y-3 scale-95 z-10 pointer-events-none",
                        )}
                      >
                        {/* Top Location Bar */}
                        <div className="px-3.5 pt-2 pb-1 flex items-center justify-between border-b border-slate-100">
                          <div className="flex items-center gap-1 text-[11px] font-extrabold text-slate-900">
                            <MapPin className="h-3 w-3 text-amber-500" />
                            <span>Daltonganj — Main Market</span>
                          </div>
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700 border border-amber-200">
                            Member
                          </span>
                        </div>

                        {/* Search Bar */}
                        <div className="p-3 pb-2">
                          <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 text-[11px] text-slate-500">
                            <Search className="h-3 w-3 text-slate-400" />
                            <span>Search cafés, salons, dining...</span>
                          </div>
                        </div>

                        {/* Category Icons Row */}
                        <div className="grid grid-cols-4 gap-1 px-3 pb-2 text-center border-b border-slate-100">
                          <div className="flex flex-col items-center gap-0.5 p-1 rounded-lg bg-amber-50/80">
                            <Utensils className="h-3.5 w-3.5 text-amber-600" />
                            <span className="text-[9px] font-bold text-amber-900">Dining</span>
                          </div>
                          <div className="flex flex-col items-center gap-0.5 p-1 rounded-lg">
                            <Coffee className="h-3.5 w-3.5 text-slate-600" />
                            <span className="text-[9px] font-medium text-slate-600">Cafés</span>
                          </div>
                          <div className="flex flex-col items-center gap-0.5 p-1 rounded-lg">
                            <Building2 className="h-3.5 w-3.5 text-slate-600" />
                            <span className="text-[9px] font-medium text-slate-600">Hotels</span>
                          </div>
                          <div className="flex flex-col items-center gap-0.5 p-1 rounded-lg">
                            <Dumbbell className="h-3.5 w-3.5 text-slate-600" />
                            <span className="text-[9px] font-medium text-slate-600">Gyms</span>
                          </div>
                        </div>

                        {/* Nearby List */}
                        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-extrabold text-slate-900 uppercase tracking-wider">
                              Nearby for you
                            </span>
                            <span className="font-bold text-amber-600">See all</span>
                          </div>

                          {/* Business Card 1 */}
                          <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white p-2 shadow-2xs">
                            <img
                              src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=200&q=80"
                              alt="Café Bliss"
                              width={48}
                              height={48}
                              loading="lazy"
                              decoding="async"
                              className="h-12 w-12 rounded-lg object-cover shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-slate-900 truncate">
                                  Café Bliss
                                </h4>
                                <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-black text-white shrink-0">
                                  20% OFF
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500">Main Road • 0.4 km</p>
                              <span className="text-[9px] font-bold text-amber-600">
                                ★ 4.8 (124 reviews)
                              </span>
                            </div>
                          </div>

                          {/* Business Card 2 */}
                          <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white p-2 shadow-2xs">
                            <img
                              src="https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=200&q=80"
                              alt="The Grand Stay"
                              width={48}
                              height={48}
                              loading="lazy"
                              decoding="async"
                              className="h-12 w-12 rounded-lg object-cover shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-slate-900 truncate">
                                  The Grand Hotel
                                </h4>
                                <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-black text-white shrink-0">
                                  15% OFF
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500">Station Road • 1.2 km</p>
                              <span className="text-[9px] font-bold text-amber-600">
                                ★ 4.9 (88 reviews)
                              </span>
                            </div>
                          </div>

                          {/* Business Card 3 */}
                          <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white p-2 shadow-2xs">
                            <img
                              src="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=200&q=80"
                              alt="FitZone Studio"
                              width={48}
                              height={48}
                              loading="lazy"
                              decoding="async"
                              className="h-12 w-12 rounded-lg object-cover shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-slate-900 truncate">
                                  FitZone Gym
                                </h4>
                                <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-black text-white shrink-0">
                                  25% OFF
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500">Bypass Road • 2.0 km</p>
                              <span className="text-[9px] font-bold text-amber-600">
                                ★ 4.7 (52 reviews)
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom App Navigation */}
                        <div className="flex items-center justify-around border-t border-slate-100 bg-white py-2 text-[9px] text-slate-500">
                          <div className="flex flex-col items-center text-amber-600 font-bold">
                            <Store className="h-3.5 w-3.5" />
                            <span>Home</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <Compass className="h-3.5 w-3.5" />
                            <span>Explore</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <Bookmark className="h-3.5 w-3.5" />
                            <span>Saved</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <User className="h-3.5 w-3.5" />
                            <span>Profile</span>
                          </div>
                        </div>
                      </div>

                      {/* ------------------------------------------------------ */}
                      {/* SCREEN 2: ENTER MEMBERSHIP NUMBER                      */}
                      {/* ------------------------------------------------------ */}
                      <div
                        className={cn(
                          "absolute inset-0 flex flex-col bg-slate-50 transition-all duration-500 ease-out",
                          currentStep === 2
                            ? "opacity-100 translate-y-0 scale-100 z-20 pointer-events-auto"
                            : "opacity-0 translate-y-3 scale-95 z-10 pointer-events-none",
                        )}
                      >
                        {/* Partner Outlet Header */}
                        <div className="bg-slate-900 p-3 text-white">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400 text-slate-950 font-black text-xs">
                              CB
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-xs font-bold truncate leading-none">
                                Café Bliss
                              </h3>
                              <span className="text-[9px] text-amber-300">
                                Verified Partner Outlet
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between rounded-md bg-white/10 px-2 py-1 text-[9px]">
                            <span className="flex items-center gap-1 text-slate-300">
                              <QrCode className="h-3 w-3 text-amber-400" /> Scanned Standee #42
                            </span>
                            <span className="font-bold text-emerald-400">Ready</span>
                          </div>
                        </div>

                        {/* Input Body */}
                        <div className="flex-1 p-3 flex flex-col justify-between">
                          <div className="space-y-3">
                            {/* Offer Badge */}
                            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-2.5">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-800">
                                Active Member Privilege
                              </span>
                              <div className="mt-0.5 flex items-baseline gap-2">
                                <strong className="text-sm font-black text-slate-900">
                                  Flat 20% OFF
                                </strong>
                                <span className="text-[9px] text-slate-600">On total bill</span>
                              </div>
                            </div>

                            {/* Member ID Field */}
                            <div>
                              <label className="block text-[10px] font-bold text-slate-700 mb-1">
                                Physical Card / Member ID
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  readOnly
                                  value="PEN-7X4P-92LM"
                                  className="w-full rounded-lg border-2 border-amber-400 bg-white px-2.5 py-1.5 font-mono text-[11px] font-bold tracking-wider text-slate-900 shadow-2xs"
                                />
                                <BadgeCheck className="absolute right-2.5 top-2 h-3.5 w-3.5 text-emerald-600" />
                              </div>
                              <span className="mt-0.5 block text-[9px] font-medium text-emerald-700">
                                ✓ Card Active & Verified for 2026
                              </span>
                            </div>

                            {/* Card Graphic */}
                            <div className="overflow-hidden rounded-xl border border-amber-300/40 shadow-sm">
                              <img
                                src={CARD_URL}
                                alt="Card Preview"
                                className="h-20 w-full object-cover"
                              />
                            </div>
                          </div>

                          <button className="w-full rounded-xl bg-slate-900 py-2 text-[11px] font-bold text-white shadow-sm flex items-center justify-center gap-1.5">
                            <span>Proceed to Savings</span>
                            <ArrowRight className="h-3 w-3 text-amber-400" />
                          </button>
                        </div>
                      </div>

                      {/* ------------------------------------------------------ */}
                      {/* SCREEN 3: VERIFY DISCOUNT BILL CALCULATION             */}
                      {/* ------------------------------------------------------ */}
                      <div
                        className={cn(
                          "absolute inset-0 flex flex-col bg-slate-50 transition-all duration-500 ease-out",
                          currentStep === 3
                            ? "opacity-100 translate-y-0 scale-100 z-20 pointer-events-auto"
                            : "opacity-0 translate-y-3 scale-95 z-10 pointer-events-none",
                        )}
                      >
                        {/* Header */}
                        <div className="bg-slate-900 p-3 text-white">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400">
                            Calculation Breakdown
                          </span>
                          <h3 className="font-display text-xs font-bold text-white mt-0.5">
                            Verify Bill Savings
                          </h3>
                        </div>

                        {/* Breakdown Body */}
                        <div className="flex-1 p-3 flex flex-col justify-between">
                          <div className="space-y-2.5">
                            {/* Bill Input */}
                            <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs">
                              <span className="block text-[9px] font-semibold text-slate-500">
                                Entered Preliminary Bill
                              </span>
                              <div className="mt-0.5 flex items-baseline justify-between">
                                <span className="font-display text-base font-bold text-slate-900">
                                  ₹1,500.00
                                </span>
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold text-slate-600">
                                  Table #04
                                </span>
                              </div>
                            </div>

                            {/* Calculation Summary */}
                            <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-2.5 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-600 font-medium">Subtotal</span>
                                <span className="font-bold text-slate-900">₹1,500.00</span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-amber-800 font-bold">
                                <span>PennyGrade Privilege (20%)</span>
                                <span className="text-amber-600">-₹300.00</span>
                              </div>
                              <div className="border-t border-amber-200 pt-1.5 flex items-center justify-between text-[11px]">
                                <span className="font-bold text-slate-900">
                                  Final Payable to Staff
                                </span>
                                <span className="font-display text-sm font-black text-emerald-700">
                                  ₹1,200.00
                                </span>
                              </div>
                            </div>

                            {/* Security Badge */}
                            <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 p-2 text-[9px] text-slate-600">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              <span>Validated securely via PennyGrade server RPC</span>
                            </div>
                          </div>

                          <button className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-2 text-[11px] font-bold text-white shadow-sm flex items-center justify-center gap-1.5">
                            <span>Launch Live Verification</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* ------------------------------------------------------ */}
                      {/* SCREEN 4: LIVE CRYPTOGRAPHIC VERIFICATION              */}
                      {/* ------------------------------------------------------ */}
                      <div
                        className={cn(
                          "absolute inset-0 flex flex-col bg-slate-950 text-white transition-all duration-500 ease-out",
                          currentStep === 4
                            ? "opacity-100 translate-y-0 scale-100 z-20 pointer-events-auto"
                            : "opacity-0 translate-y-3 scale-95 z-10 pointer-events-none",
                        )}
                      >
                        {/* Live Countdown Banner */}
                        <div className="border-b border-emerald-500/30 bg-emerald-950/70 px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1.5 text-emerald-400">
                            <span className="relative flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                            </span>
                            <span className="font-mono text-[9px] font-black tracking-widest uppercase">
                              LIVE VERIFICATION
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center justify-center gap-1 font-mono text-lg font-black text-white">
                            <Clock className="h-3.5 w-3.5 text-emerald-400" />
                            <span>04:48</span>
                          </div>
                          <span className="text-[8px] text-emerald-300">
                            Valid for 5 minutes only
                          </span>
                        </div>

                        {/* Verification Body */}
                        <div className="flex-1 p-3 flex flex-col justify-between">
                          <div className="space-y-2.5">
                            <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-center backdrop-blur-2xs">
                              <span className="text-[8px] uppercase tracking-wider text-slate-400">
                                Show to Café Bliss Staff
                              </span>
                              <div className="mt-0.5 font-display text-xl font-black text-amber-400">
                                ₹300.00 OFF
                              </div>
                              <span className="text-[9px] font-bold text-slate-300">
                                Deduct from Final POS Bill
                              </span>
                            </div>

                            <div className="space-y-1 rounded-lg border border-white/10 bg-white/5 p-2 text-[10px]">
                              <div className="flex justify-between text-slate-400">
                                <span>Member ID</span>
                                <span className="font-mono font-bold text-white">
                                  PEN-7X4P-92LM
                                </span>
                              </div>
                              <div className="flex justify-between text-slate-400">
                                <span>Net Payable</span>
                                <span className="font-mono font-bold text-emerald-400">
                                  ₹1,200.00
                                </span>
                              </div>
                              <div className="flex justify-between text-slate-400">
                                <span>Token Hash</span>
                                <span className="font-mono text-[8px] text-slate-400">
                                  SEC-992B-04E1
                                </span>
                              </div>
                            </div>

                            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-center text-[9px] font-medium text-emerald-300">
                              ✓ Staff verifies running timer & applies manual deduction
                            </div>
                          </div>

                          <div className="text-center text-[9px] text-slate-500">
                            PennyGrade Smart Offline Privilege
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Home Indicator Bar */}
                    <div className="flex h-4 w-full items-center justify-center bg-white border-t border-slate-100">
                      <div className="h-1 w-24 rounded-full bg-slate-300" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* SECTION 3: MEMBERSHIP ECOSYSTEM                                      */}
      {/* ==================================================================== */}
      <section
        ref={ecosystemRef}
        className="relative overflow-hidden bg-slate-900 py-20 sm:py-28 text-white border-t border-slate-800"
      >
        {/* Subtle Background Pattern */}
        <div className="pointer-events-none absolute inset-0 opacity-15">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="ecosystem-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="rgba(251, 191, 36, 0.2)"
                  strokeWidth="0.8"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#ecosystem-pattern)" />
          </svg>
        </div>

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          {/* Central Animated Heading */}
          <div
            className={cn(
              "mx-auto max-w-3xl text-center transition-all duration-700",
              ecosystemInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
            )}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold tracking-widest text-amber-300 uppercase">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>THE PRIVILEGE NETWORK</span>
            </div>

            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
              ONE MEMBERSHIP.
              <span className="block mt-1 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">
                ENDLESS POSSIBILITIES.
              </span>
            </h2>

            <p className="mt-4 text-sm font-medium leading-relaxed text-slate-300 sm:text-base">
              A single physical PennyGrade card unlocks curated partner savings across dining, daily
              coffee, luxury stays, fitness, and everyday services.
            </p>
          </div>

          {/* Connected Category Grid */}
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
            {ECOSYSTEM_CATEGORIES.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.name}
                  style={{
                    transitionDelay: `${idx * 60}ms`,
                  }}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 p-4.5 backdrop-blur-2xs transition-all duration-500 hover:-translate-y-1 hover:border-amber-400/60 hover:shadow-lg hover:shadow-amber-500/10",
                    ecosystemInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
                  )}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 border border-white/10 text-amber-400 shadow-inner group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>

                  <h3 className="mt-3.5 font-display text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                    {cat.name}
                  </h3>

                  <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{cat.tagline}</p>

                  <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2">
                    <span className="text-[10px] font-bold text-amber-400">{cat.savings}</span>
                    <ChevronRight className="h-3 w-3 text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-amber-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* SECTION 4: FINAL LIFESTYLE COLLAGE                                   */}
      {/* ==================================================================== */}
      <section
        ref={collageRef}
        className="relative overflow-hidden bg-slate-950 py-20 sm:py-28 text-white border-t border-slate-800"
      >
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          {/* Center Anchor Headline */}
          <div className="relative z-20 mx-auto max-w-3xl text-center py-6">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-amber-400 mb-1.5">
              Citywide Privilege
            </span>
            <h2 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
              Your Whole City.
              <span className="block mt-1 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">
                One Membership.
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm font-medium leading-relaxed text-slate-300 sm:text-base">
              From morning artisan coffee to celebratory rooftop dinners and weekend wellness
              retreats, PennyGrade is woven into the rhythm of your lifestyle.
            </p>
          </div>

          {/* Collage Grid with Controlled Subtle Parallax */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 sm:gap-4">
            {/* Image 1: Dining */}
            <div
              style={{
                transform: reducedMotion
                  ? "none"
                  : `translateY(${(1 - collageProgress) * 16}px) scale(${0.96 + collageProgress * 0.04})`,
                transition: "transform 0.3s ease-out",
              }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900 aspect-[4/5] shadow-md"
            >
              <img
                src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80"
                alt="Fine Dining"
                width={300}
                height={375}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent p-3 flex flex-col justify-end">
                <span className="text-[10px] font-bold text-amber-300">Dining</span>
                <p className="text-xs font-bold text-white">Fine Bistros</p>
              </div>
            </div>

            {/* Image 2: Cafés */}
            <div
              style={{
                transform: reducedMotion
                  ? "none"
                  : `translateY(${(1 - collageProgress) * -12}px) scale(${0.96 + collageProgress * 0.04})`,
                transition: "transform 0.3s ease-out",
              }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900 aspect-[4/5] shadow-md lg:mt-5"
            >
              <img
                src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80"
                alt="Artisan Café"
                width={300}
                height={375}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent p-3 flex flex-col justify-end">
                <span className="text-[10px] font-bold text-amber-300">Cafés</span>
                <p className="text-xs font-bold text-white">Artisan Coffee</p>
              </div>
            </div>

            {/* Image 3: Hotels */}
            <div
              style={{
                transform: reducedMotion
                  ? "none"
                  : `translateY(${(1 - collageProgress) * 20}px) scale(${0.96 + collageProgress * 0.04})`,
                transition: "transform 0.3s ease-out",
              }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900 aspect-[4/5] shadow-md"
            >
              <img
                src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80"
                alt="Luxury Hotel"
                width={300}
                height={375}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent p-3 flex flex-col justify-end">
                <span className="text-[10px] font-bold text-amber-300">Stays</span>
                <p className="text-xs font-bold text-white">Resorts & Hotels</p>
              </div>
            </div>

            {/* Image 4: Boutique Shopping */}
            <div
              style={{
                transform: reducedMotion
                  ? "none"
                  : `translateY(${(1 - collageProgress) * -16}px) scale(${0.96 + collageProgress * 0.04})`,
                transition: "transform 0.3s ease-out",
              }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900 aspect-[4/5] shadow-md lg:mt-5"
            >
              <img
                src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80"
                alt="Boutique Shopping"
                width={300}
                height={375}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent p-3 flex flex-col justify-end">
                <span className="text-[10px] font-bold text-amber-300">Retail</span>
                <p className="text-xs font-bold text-white">Lifestyle Stores</p>
              </div>
            </div>

            {/* Image 5: Fitness */}
            <div
              style={{
                transform: reducedMotion
                  ? "none"
                  : `translateY(${(1 - collageProgress) * 14}px) scale(${0.96 + collageProgress * 0.04})`,
                transition: "transform 0.3s ease-out",
              }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900 aspect-[4/5] shadow-md"
            >
              <img
                src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=600&q=80"
                alt="Fitness Gym"
                width={300}
                height={375}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent p-3 flex flex-col justify-end">
                <span className="text-[10px] font-bold text-amber-300">Wellness</span>
                <p className="text-xs font-bold text-white">Gyms & Studios</p>
              </div>
            </div>

            {/* Image 6: Travel */}
            <div
              style={{
                transform: reducedMotion
                  ? "none"
                  : `translateY(${(1 - collageProgress) * -10}px) scale(${0.96 + collageProgress * 0.04})`,
                transition: "transform 0.3s ease-out",
              }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900 aspect-[4/5] shadow-md lg:mt-5"
            >
              <img
                src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80"
                alt="Travel"
                width={300}
                height={375}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent p-3 flex flex-col justify-end">
                <span className="text-[10px] font-bold text-amber-300">Travel</span>
                <p className="text-xs font-bold text-white">Adventures</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* FINAL TRUST, STAFF EXPERIENCE & CALLS TO ACTION                      */}
      {/* ==================================================================== */}
      <section className="bg-slate-50 py-16 border-t border-slate-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* Oboroto 4-grid Trust Banner */}
          <div className="grid grid-cols-2 overflow-hidden rounded-2xl bg-slate-900 text-white shadow-md sm:grid-cols-4">
            <div className="flex items-center justify-center gap-3 border-r border-white/10 p-4 text-center">
              <ShieldCheck className="h-6 w-6 text-amber-400 shrink-0" />
              <div className="text-left">
                <strong className="block text-xs font-extrabold text-white">Trusted</strong>
                <span className="text-[11px] text-slate-400">Partners</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 border-r border-white/10 p-4 text-center">
              <Percent className="h-6 w-6 text-amber-400 shrink-0" />
              <div className="text-left">
                <strong className="block text-xs font-extrabold text-white">Guaranteed</strong>
                <span className="text-[11px] text-slate-400">Discounts</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 border-r border-white/10 p-4 text-center">
              <QrCode className="h-6 w-6 text-amber-400 shrink-0" />
              <div className="text-left">
                <strong className="block text-xs font-extrabold text-white">100% Secure</strong>
                <span className="text-[11px] text-slate-400">Cryptographic</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 p-4 text-center">
              <Users className="h-6 w-6 text-amber-400 shrink-0" />
              <div className="text-left">
                <strong className="block text-xs font-extrabold text-white">Zero App</strong>
                <span className="text-[11px] text-slate-400">Hassle</span>
              </div>
            </div>
          </div>

          {/* Staff Experience Info Box */}
          <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-amber-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  Partner Counter Staff Experience
                </h3>
                <p className="text-xs text-slate-500">Why merchants love PennyGrade</p>
              </div>
            </div>
            <p className="mt-4 text-xs font-medium leading-relaxed text-slate-600 sm:text-sm">
              PennyGrade requires{" "}
              <strong>
                zero staff training, zero scanning equipment, and zero POS integration
              </strong>
              . When a member shows their phone, staff glance at the screen to verify three clear
              details:
            </p>
            <ul className="mt-4 grid gap-2.5 text-xs font-bold text-slate-800 sm:grid-cols-3">
              <li className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 p-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Active running 5-min timer</span>
              </li>
              <li className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 p-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Correct partner outlet name</span>
              </li>
              <li className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 p-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Exact discount amount for the bill</span>
              </li>
            </ul>
          </div>

          {/* Bottom Actions */}
          <div className="mt-10 flex flex-wrap items-center justify-center sm:justify-start gap-4">
            <Link
              to="/partners"
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-8 text-xs font-extrabold text-white shadow-lg shadow-amber-500/30 transition-all hover:from-amber-400 hover:to-amber-500 hover:-translate-y-0.5"
            >
              Explore Partner Directory <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              to="/history"
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border-2 border-slate-900 bg-white px-8 text-xs font-extrabold text-slate-900 shadow-xs transition-all hover:bg-slate-900 hover:text-white hover:-translate-y-0.5"
            >
              Check Member History
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
