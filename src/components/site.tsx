import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Menu,
  X,
  MapPin,
  ArrowRight,
  ShieldCheck,
  History,
  Phone,
  Mail,
  Home,
  ChevronRight,
  Store,
  QrCode,
  CreditCard,
  ChevronDown,
  Sparkles,
  Heart,
} from "lucide-react";
import { Wordmark, LogoMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/use-session";
import { supabase } from "@/integrations/supabase/client";
import { offerHeadline, offerSub, inr, formatDays } from "@/lib/format";
import type { PublicPartner } from "@/lib/public.functions";

export function SiteHeader() {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState("Daltonganj");
  const navigate = useNavigate();

  const desktopLinks = [
    { to: "/partners", label: "Partners" },
    { to: "/offers", label: "Offers" },
    { to: "/how-it-works", label: "How It Works" },
    { to: "/partner-with-us", label: "Partner With Us" },
    { to: "/history", label: "History" },
  ];

  const mobileLinks = [
    { to: "/", label: "Home" },
    { to: "/partners", label: "Partners" },
    { to: "/offers", label: "Offers" },
    { to: "/how-it-works", label: "How It Works" },
    { to: "/become-a-member", label: "Become a Member" },
    { to: "/partner-with-us", label: "Partner With Us" },
    { to: "/history", label: "History" },
  ];

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#ececf1] bg-white/95 text-foreground backdrop-blur-md transition-all">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-10">
        {/* Brand */}
        <Wordmark className="shrink-0" />

        {/* Desktop Nav - Spacious & Uncrowded */}
        <nav className="hidden items-center gap-7 lg:flex xl:gap-9">
          {desktopLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              className="relative rounded-lg px-2.5 py-1.5 text-[13.5px] font-semibold text-slate-600 transition-all hover:bg-amber-50/70 hover:text-amber-600 xl:text-[14.5px]"
              activeProps={{
                className:
                  "!text-slate-900 font-extrabold bg-amber-50/90 after:content-[''] after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[2.5px] after:rounded-full after:bg-gradient-to-r after:from-amber-400 after:to-amber-500",
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Nav Actions - Spacious Cluster */}
        <div className="hidden items-center gap-3 lg:flex xl:gap-4.5">
          {/* Exclusive City Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setCityOpen(!cityOpen)}
              aria-expanded={cityOpen}
              aria-haspopup="dialog"
              aria-label="Select location, currently Daltonganj (Live)"
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50/70 px-3.5 py-1 text-[12px] font-bold text-amber-900 shadow-2xs transition-colors hover:bg-amber-100/80 cursor-pointer"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <MapPin className="h-3.5 w-3.5 text-amber-600" />
              <span>Daltonganj</span>
              <span className="rounded-md bg-amber-200/80 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-amber-900">
                Live
              </span>
            </button>

            {cityOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xl z-50 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <MapPin className="h-4 w-4 text-amber-500" />
                  <span>Daltonganj, Jharkhand</span>
                </div>
                <p className="mt-1.5 text-slate-500 leading-relaxed text-[11px]">
                  PennyGrade membership and in-person counter discounts are currently live exclusively across partner outlets in Daltonganj (Palamu).
                </p>
                <div className="mt-2.5 rounded-lg bg-amber-50 p-2 text-[10px] font-medium text-amber-800 border border-amber-200/60">
                  Expansion to Ranchi and other cities coming soon!
                </div>
              </div>
            )}
          </div>

          <div className="hidden h-5 w-px bg-slate-200/80 xl:block" />

          {user ? (
            <>
              <Link
                to="/admin"
                className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 text-[13px] font-bold text-white shadow-md shadow-amber-500/25 transition-all hover:from-amber-400 hover:to-amber-500 hover:shadow-lg hover:shadow-amber-500/35 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                Admin Console
              </Link>
              <Button
                size="sm"
                variant="ghost"
                className="text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                onClick={signOut}
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link
                to="/become-a-member"
                className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 text-[13px] font-extrabold text-white shadow-md shadow-amber-500/25 transition-all hover:from-amber-400 hover:to-amber-500 hover:shadow-lg hover:shadow-amber-500/35 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <CreditCard className="h-4 w-4 mr-1.5" /> Get Card (₹500)
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="rounded-lg p-2 text-navy hover:bg-muted lg:hidden cursor-pointer"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {open && (
        <div id="mobile-navigation" className="border-t border-[#ececf1] bg-white px-4 pb-6 pt-2 shadow-lg lg:hidden">
          <nav className="flex flex-col space-y-1">
            {mobileLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-base font-semibold text-foreground hover:bg-muted hover:text-amber-600 transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="mt-4 border-t border-[#ececf1] pt-4">
            <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold">City:</span>
              <span className="font-bold text-foreground">{selectedCity}</span>
            </div>

            {user ? (
              <div className="flex gap-2">
                <Button asChild className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 font-bold text-white shadow-md shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500">
                  <Link to="/admin" onClick={() => setOpen(false)}>Admin Console</Link>
                </Button>
                <Button variant="outline" className="flex-1 rounded-xl border-slate-200" onClick={signOut}>
                  Sign out
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Button asChild className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 font-bold text-white shadow-md shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500">
                  <Link to="/partners" onClick={() => setOpen(false)}>Explore Partners</Link>
                </Button>
                <Button asChild variant="outline" className="w-full rounded-xl border-slate-200">
                  <Link to="/history" onClick={() => setOpen(false)}>Check Member History</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 bg-navy-deep text-navy-muted">
      {/* 4-column Footer Grid matching Oboroto */}
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-4">
        {/* Col 1: About & Contact */}
        <div className="md:col-span-1">
          <Wordmark className="text-white" />
          <p className="mt-4 text-xs leading-relaxed text-navy-muted">
            India's Smart Physical Card Discount Membership connecting members with trusted local businesses.
          </p>

          <div className="mt-5 space-y-2.5 text-xs">
            <a
              href="tel:+919356897893"
              className="flex items-center gap-2 text-navy-foreground/90 transition-colors hover:text-gold"
            >
              <Phone className="h-3.5 w-3.5 text-gold" />
              <span>+91 93568 97893</span>
            </a>
            <a
              href="mailto:pennygradebusiness@gmail.com"
              className="flex items-center gap-2 text-navy-foreground/90 transition-colors hover:text-gold"
            >
              <Mail className="h-3.5 w-3.5 text-gold" />
              <span>pennygradebusiness@gmail.com</span>
            </a>
            <div className="flex items-center gap-2 text-[11px] text-gold">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>100% Cryptographically Verified</span>
            </div>
          </div>
        </div>

        {/* Col 2: Explore */}
        <div>
          <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-gold">Explore</h4>
          <ul className="space-y-2.5 text-xs font-semibold">
            <li>
              <Link to="/" className="text-navy-muted transition-colors hover:text-white">
                Home
              </Link>
            </li>
            <li>
              <Link to="/partners" className="text-navy-muted transition-colors hover:text-white">
                Partner Businesses
              </Link>
            </li>
            <li>
              <Link to="/offers" className="text-navy-muted transition-colors hover:text-white">
                Member Offers
              </Link>
            </li>
            <li>
              <Link to="/become-a-member" className="text-navy-muted transition-colors hover:text-white">
                Become a Member
              </Link>
            </li>
            <li>
              <Link to="/partner-with-us" className="text-navy-muted transition-colors hover:text-white">
                Partner With Us
              </Link>
            </li>
            <li>
              <Link to="/how-it-works" className="text-navy-muted transition-colors hover:text-white">
                How It Works
              </Link>
            </li>
            <li>
              <Link to="/history" className="text-navy-muted transition-colors hover:text-white">
                Check History
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Support & Legal */}
        <div>
          <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-gold">Support & Legal</h4>
          <ul className="space-y-2.5 text-xs font-semibold">
            <li>
              <a href="mailto:pennygradebusiness@gmail.com" className="text-navy-muted transition-colors hover:text-white">
                Contact Support
              </a>
            </li>
            <li>
              <Link to="/terms" className="text-navy-muted transition-colors hover:text-white">
                Terms & Conditions
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="text-navy-muted transition-colors hover:text-white">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/merchant-agreement" className="text-navy-muted transition-colors hover:text-white">
                Merchant Agreement
              </Link>
            </li>
            <li>
              <Link to="/membership-terms" className="text-navy-muted transition-colors hover:text-white">
                Membership & Card Terms
              </Link>
            </li>
            <li>
              <Link to="/disclaimer" className="text-navy-muted transition-colors hover:text-white">
                Website Disclaimer
              </Link>
            </li>
            <li>
              <Link to="/admin/login" className="text-navy-muted/60 transition-colors hover:text-gold">
                Admin Console
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 4: Physical Card Perks */}
        <div>
          <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-gold">Start Saving Today</h4>
          <p className="text-xs leading-relaxed text-navy-muted">
            Carry your physical PennyGrade card and enjoy guaranteed savings at top dining, shopping, wellness & entertainment spots.
          </p>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <CreditCard className="h-4 w-4 text-gold" />
              <span>Zero App Download Needed</span>
            </div>
            <p className="mt-1 text-[11px] text-navy-muted">
              Scan the counter QR standee at any partner and save instantly.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Legal bar */}
      <div className="border-t border-white/10 py-6 text-center text-xs text-navy-muted">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
          <span>&copy; {new Date().getFullYear()} PennyGrade. All rights reserved.</span>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/terms" className="hover:text-white">Terms</Link>
            <Link to="/privacy" className="hover:text-white">Privacy</Link>
            <Link to="/merchant-agreement" className="hover:text-white">Merchant Agreement</Link>
            <Link to="/disclaimer" className="hover:text-white">Disclaimer</Link>
            <Link to="/how-it-works" className="hover:text-white">Help</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-slate-900 focus:px-4 focus:py-2.5 focus:text-xs focus:font-bold focus:text-white focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
      >
        Skip to main content
      </a>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

export function Breadcrumbs({ items }: { items: Array<{ label: string; to?: string }> }) {
  return (
    <nav className="mb-6 flex items-center gap-2 text-xs font-semibold text-muted-foreground" aria-label="Breadcrumb">
      <Link to="/" className="inline-flex items-center gap-1 transition-colors hover:text-gold">
        <Home className="h-3.5 w-3.5" />
        <span>Home</span>
      </Link>
      {items.map((it, idx) => (
        <span key={idx} className="inline-flex items-center gap-2">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          {it.to ? (
            <Link to={it.to} className="transition-colors hover:text-gold">
              {it.label}
            </Link>
          ) : (
            <span className="font-bold text-foreground">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function PageHero({
  eyebrow,
  title,
  highlight,
  children,
  breadcrumbs,
}: {
  eyebrow?: string;
  title: string;
  highlight?: string;
  children?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; to?: string }>;
}) {
  return (
    <section className="border-b border-[#ececf1] bg-white py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        {eyebrow && (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-600">{eyebrow}</p>
        )}
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          {title}{" "}
          {highlight && (
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600">
              {highlight}
            </span>
          )}
        </h1>
        {children && <div className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">{children}</div>}
      </div>
    </section>
  );
}

function getCategoryCover(categoryName?: string | null) {
  const cat = (categoryName || "").toLowerCase();
  if (cat.includes("caf") || cat.includes("coffee") || cat.includes("bakery")) {
    return "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=700&q=80";
  }
  if (cat.includes("rest") || cat.includes("din") || cat.includes("food")) {
    return "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=700&q=80";
  }
  if (cat.includes("hotel") || cat.includes("stay") || cat.includes("resort") || cat.includes("inn")) {
    return "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=700&q=80";
  }
  if (cat.includes("salon") || cat.includes("spa") || cat.includes("beauty") || cat.includes("hair")) {
    return "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=700&q=80";
  }
  if (cat.includes("fit") || cat.includes("gym") || cat.includes("yoga")) {
    return "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=700&q=80";
  }
  if (cat.includes("shop") || cat.includes("retail") || cat.includes("store")) {
    return "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=700&q=80";
  }
  return "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=700&q=80";
}

export function PartnerCard({ p }: { p: PublicPartner }) {
  const offer = p.offers && p.offers.length > 0 ? p.offers[0] : null;
  const [isFav, setIsFav] = useState(false);
  const coverUrl = p.cover_image_url || getCategoryCover(p.category?.name);

  // Format discount pill
  let discountBadge = "";
  let discountNote = "";
  if (offer) {
    if (offer.discount_type === "PERCENTAGE") {
      discountBadge = `${offer.discount_value}% OFF`;
    } else {
      discountBadge = `₹${offer.discount_value} OFF`;
    }
    discountNote = offer.description || "Exclusive member discount";
  }

  return (
    <Link
      to="/partners/$slug"
      params={{ slug: p.slug }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/80 hover:shadow-lg"
    >
      {/* 16:10 Image container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
        <img
          src={coverUrl}
          alt={p.business_name}
          loading="lazy"
          decoding="async"
          width={700}
          height={438}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Category Badge overlay on top-left */}
        {p.category && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-slate-800 shadow-sm backdrop-blur-xs">
            {p.category.name}
          </span>
        )}

        {/* Favorite Heart Button on top-right */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsFav(!isFav);
          }}
          aria-label="Save to favorites"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm backdrop-blur-xs transition-all hover:bg-white hover:scale-110"
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              isFav ? "fill-red-500 text-red-500" : "text-slate-600 hover:text-red-500"
            }`}
          />
        </button>

        {/* Logo Avatar overlapping bottom-right if available */}
        {p.logo_url && (
          <div className="absolute bottom-2 right-3">
            <img
              src={p.logo_url}
              alt=""
              loading="lazy"
              decoding="async"
              width={36}
              height={36}
              className="h-9 w-9 rounded-xl border-2 border-white object-cover shadow-sm"
            />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4 sm:p-4.5">
        <h3 className="line-clamp-1 font-display text-[16px] font-bold text-slate-900 transition-colors group-hover:text-amber-700">
          {p.business_name}
        </h3>

        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span className="truncate">{p.city ? `${p.city}, Jharkhand` : "Daltonganj, Jharkhand"}</span>
        </div>

        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
          {p.description || "Discover verified member savings, warm ambience, and dedicated PennyGrade partner benefits."}
        </p>

        {/* Clear Discount Conditions */}
        {offer && (offer.minimum_bill > 0 || offer.max_discount || (offer.valid_days?.length && offer.valid_days.length < 7)) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px]">
            {offer.minimum_bill > 0 && (
              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                Min Bill {inr(offer.minimum_bill)}
              </span>
            )}
            {offer.max_discount && (
              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                Max {inr(offer.max_discount)}
              </span>
            )}
            {offer.valid_days?.length && offer.valid_days.length < 7 && (
              <span className="rounded-md bg-amber-50 px-2 py-0.5 font-semibold text-amber-800 border border-amber-200/60">
                {formatDays(offer.valid_days)}
              </span>
            )}
          </div>
        )}

        {/* Footer Offer strip */}
        <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
          {offer ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-block rounded-lg bg-[#fef2eb] px-2.5 py-1 font-display text-xs font-black text-[#c25e36] border border-[#fcdccf] shrink-0">
                {discountBadge}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium text-slate-600">{discountNote}</p>
                <p className="text-[10px] font-semibold text-slate-400 leading-tight">Exclusive for members</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-block rounded-lg bg-slate-100 px-2.5 py-1 font-display text-[11px] font-bold text-slate-600 border border-slate-200 shrink-0">
                New Partner
              </span>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium text-slate-500">Offers updating soon</p>
                <p className="text-[10px] font-semibold text-slate-400 leading-tight">Exclusive for members</p>
              </div>
            </div>
          )}

          {/* Terracotta Circular Arrow Button */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#c25e36] text-white shadow-xs transition-transform duration-300 group-hover:scale-110 group-hover:bg-[#a84d28]">
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export function PartnerCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[12px] border border-[#ececf1] bg-white">
      <div className="aspect-[16/10] animate-pulse bg-muted" />
      <div className="space-y-2.5 p-4">
        <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-8 w-full animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export { LogoMark };
