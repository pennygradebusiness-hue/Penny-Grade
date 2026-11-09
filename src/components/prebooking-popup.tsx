import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Gift,
  Megaphone,
  ShieldCheck,
  Star,
} from "lucide-react";
import { LogoMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { inr } from "@/lib/format";
import { getPublicPrebookingCampaigns, type PrebookingCampaign } from "@/lib/public.functions";

const comingSoonItems = [
  { icon: CalendarDays, label: "Campaign\ndetails" },
  { icon: Bell, label: "Early\nupdates" },
  { icon: Gift, label: "Benefits\nlisted" },
  { icon: ShieldCheck, label: "Terms\nupfront" },
];

export function PrebookingPopup() {
  const location = useLocation();
  const getCampaigns = useServerFn(getPublicPrebookingCampaigns);
  const [campaign, setCampaign] = useState<PrebookingCampaign | null>(null);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (
      location.pathname.startsWith("/admin") ||
      location.pathname.startsWith("/checkout") ||
      location.pathname.startsWith("/prebook")
    ) {
      setOpen(false);
      return;
    }

    getCampaigns()
      .then((items) => {
        if (cancelled) return;
        const now = Date.now();
        const next = items.find(
          (item) =>
            item.popup_enabled &&
            now >= Date.parse(item.booking_opens_at) &&
            now < Date.parse(item.booking_closes_at),
        );

        if (!next) {
          try {
            if (sessionStorage.getItem("pg-prebook-coming-soon")) return;
          } catch {
            // Session storage is an optional dismissal preference.
          }
          setCampaign(null);
          setShowComingSoon(true);
          setOpen(true);
          return;
        }

        setCampaign(next);
        setShowComingSoon(false);
        try {
          if (sessionStorage.getItem(`pg-prebook-popup:${next.id}`)) return;
        } catch {
          // Session storage is an optional dismissal preference.
        }
        setOpen(true);
      })
      .catch(() => {
        if (cancelled) return;
        try {
          if (sessionStorage.getItem("pg-prebook-coming-soon")) return;
        } catch {
          // Session storage is an optional dismissal preference.
        }
        setCampaign(null);
        setShowComingSoon(true);
        setOpen(true);
      });

    return () => {
      cancelled = true;
    };
  }, [getCampaigns, location.pathname]);

  const dismiss = (next: boolean) => {
    setOpen(next);
    if (!next) {
      try {
        sessionStorage.setItem(
          campaign ? `pg-prebook-popup:${campaign.id}` : "pg-prebook-coming-soon",
          "1",
        );
      } catch {
        // Session storage is an optional dismissal preference.
      }
    }
  };

  const benefits = useMemo(() => {
    if (!campaign) return comingSoonItems;
    return campaign.benefits.slice(0, 4).map((label, index) => ({
      icon: [CalendarDays, Bell, Gift, Star][index],
      label,
    }));
  }, [campaign]);

  if (!campaign && !showComingSoon) return null;

  const announcement = campaign ? "Prebooking is now open" : "Prebooking announcement";
  const heading = campaign?.title || "The Next Local Campaign is Coming Soon";
  const message = campaign?.summary ||
    "We’re preparing the next PennyGrade prebooking campaign. Paid bookings will open after the offer, price, dates, and terms are published.";

  return (
    <Dialog open={open} onOpenChange={dismiss}>
      <DialogContent
        overlayClassName="bg-slate-950/55 backdrop-blur-[2px]"
        className="block max-h-[min(88svh,620px)] w-[calc(100vw-1.25rem)] max-w-[800px] overflow-y-auto rounded-[24px] border-2 border-amber-400 bg-white p-0 shadow-[0_30px_100px_-30px_rgba(15,23,42,0.65)] sm:w-[calc(100vw-3rem)] sm:rounded-[30px]"
        style={{ maxHeight: "min(88svh, 620px)" }}
      >
        <div className="relative isolate min-h-0 overflow-hidden rounded-[22px] bg-[radial-gradient(circle_at_82%_52%,rgba(255,190,60,0.16),transparent_31%),linear-gradient(135deg,#fff_0%,#fffdfa_62%,#fff7e6_100%)] p-4 sm:rounded-[28px] sm:p-7 lg:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute right-[-5rem] top-20 hidden h-72 w-72 rounded-full border border-amber-200/80 lg:block" />
          <div aria-hidden="true" className="pointer-events-none absolute right-[-2.5rem] top-28 hidden h-56 w-56 rounded-full border border-amber-200/60 lg:block" />

          <div className="relative z-10 flex min-w-0 flex-wrap items-center gap-2.5 pr-9 sm:gap-4">
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-9 w-9 rounded-full sm:h-10 sm:w-10" />
              <span className="text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">
                Penny<span className="text-amber-500">Grade</span>
              </span>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3.5 py-2 text-xs font-bold text-amber-950 sm:text-sm">
              <Megaphone className="h-4 w-4 text-amber-600" />
              {announcement}
            </span>
          </div>

          <div className="relative z-10 mt-5 grid min-w-0 items-center gap-4 sm:mt-6 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)] sm:gap-3">
            <div className="min-w-0 max-w-[510px]">
              <DialogHeader className="text-left">
                <DialogTitle className="text-[25px] font-black leading-[1.06] tracking-tight text-slate-900 sm:text-[32px] lg:text-[36px]">
                  {campaign ? heading : <>The Next Local Campaign is <span className="text-amber-500">Coming Soon</span></>}
                </DialogTitle>
                <DialogDescription className="mt-2 max-w-[470px] text-[13px] leading-5 text-slate-600 sm:text-sm sm:leading-6">
                  {message}
                </DialogDescription>
              </DialogHeader>

              {campaign && (
                <p className="mt-3 text-xl font-black text-slate-900">
                  {inr(Number(campaign.amount))}
                  <span className="ml-2 text-sm font-semibold text-slate-500">booking payment</span>
                </p>
              )}

              <div className="mt-4 grid grid-cols-4 divide-x divide-slate-200 border-y border-slate-200/80 py-2.5 sm:mt-5 sm:border-y-0 sm:py-0">
                {benefits.map(({ icon: Icon, label }, index) => (
                  <div key={`${index}-${label}`} className="flex min-w-0 flex-col items-center px-1 text-center sm:px-2">
                    <Icon className="mb-1.5 h-6 w-6 text-amber-500 sm:mb-2 sm:h-7 sm:w-7" strokeWidth={2} />
                    <span className="whitespace-pre-line text-[10px] font-bold leading-4 text-slate-800 sm:text-xs sm:leading-5">
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-col gap-2.5 sm:mt-6 sm:flex-row">
                <Button asChild className="h-12 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 text-sm font-extrabold text-white shadow-[0_10px_22px_-10px_rgba(234,126,0,0.8)] hover:from-amber-600 hover:to-orange-600 sm:h-[54px] sm:w-auto sm:min-w-[260px] sm:text-base">
                  <Link to="/prebook" search={{ campaign: campaign?.slug, confirmed: undefined }}>
                    View Prebooking Page <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-12 w-full rounded-2xl border-2 border-slate-800 bg-white/80 px-5 text-sm font-bold text-slate-900 hover:bg-amber-50 sm:h-[54px] sm:w-auto sm:min-w-[180px] sm:text-base">
                  <a href={`mailto:pennygradebusiness@gmail.com?subject=${encodeURIComponent("Notify me about PennyGrade prebooking")}`}>
                    <Bell className="mr-2 h-5 w-5 text-amber-500" /> Get Notified
                  </a>
                </Button>
              </div>
              <p className="mt-3 text-center text-[11px] leading-4 text-slate-500 sm:text-left">
                {campaign
                  ? "Review the published benefits and refund terms before paying."
                  : "Email us to ask for an update. No booking or payment is being taken yet."}
              </p>
            </div>

            <div className="relative mx-auto hidden w-full min-w-0 max-w-[280px] sm:block lg:max-w-[320px]" style={{ maxWidth: 320 }}>
              <div className="absolute inset-5 rounded-full bg-amber-300/20 blur-2xl" />
              <div className="relative z-10 w-full -rotate-[5deg] overflow-hidden rounded-2xl drop-shadow-[0_18px_18px_rgba(76,44,15,0.3)]">
                <img
                  src="/pennygrade-card.webp"
                  alt="PennyGrade membership card preview with masked member number"
                  width={420}
                  height={262}
                  className="block h-auto w-full rounded-2xl object-cover"
                />
                <span
                  aria-label="Masked membership number"
                  className="absolute bottom-[4.5%] left-[5%] flex h-[15%] w-[44%] items-center rounded-sm bg-[#101a2c] px-[2%] font-mono text-[clamp(6px,1vw,10px)] font-bold tracking-[0.08em] text-slate-300"
                >
                  PEN-••••-••••
                </span>
              </div>
              <div className="relative z-10 mx-auto mt-4 w-fit rounded-full border border-amber-300 bg-slate-950 px-3.5 py-1 text-[10px] font-extrabold tracking-wide text-amber-300 shadow-lg">
                PennyGrade Membership
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
