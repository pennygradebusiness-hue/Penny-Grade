import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, MapPin, ArrowRight } from "lucide-react";
import { Wordmark, LogoMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/use-session";
import { supabase } from "@/integrations/supabase/client";
import { offerHeadline, offerSub } from "@/lib/format";
import type { PublicPartner } from "@/lib/public.functions";

export function SiteHeader() {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const links = user
    ? [
        { to: "/", label: "Home" },
        { to: "/partners", label: "Partners" },
        { to: "/offers", label: "Offers" },
        { to: "/account/membership", label: "My Membership" },
        { to: "/account/history", label: "History" },
        { to: "/account/profile", label: "Profile" },
      ]
    : [
        { to: "/", label: "Home" },
        { to: "/partners", label: "Partners" },
        { to: "/offers", label: "Offers" },
        { to: "/how-it-works", label: "How It Works" },
      ];
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };
  return (
    <header className="sticky top-0 z-40 border-b border-sidebar-border bg-navy-deep/95 text-navy-foreground backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Wordmark />
        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link key={l.to} to={l.to} activeOptions={{ exact: l.to === "/" }}
              className="rounded-md px-3 py-2 text-sm text-navy-muted transition-colors hover:text-navy-foreground"
              activeProps={{ className: "!text-gold" }}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              <Button asChild size="sm" className="bg-gold text-accent-foreground hover:bg-gold-soft"><Link to="/account">Account</Link></Button>
              <Button size="sm" variant="ghost" className="text-navy-muted hover:bg-sidebar-accent hover:text-navy-foreground" onClick={signOut}>Sign out</Button>
            </>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost" className="text-navy-foreground hover:bg-sidebar-accent hover:text-navy-foreground"><Link to="/login">Log in</Link></Button>
              <Button asChild size="sm" className="bg-gold text-accent-foreground hover:bg-gold-soft"><Link to="/register">Become a Member</Link></Button>
            </>
          )}
        </div>
        <button className="rounded-md p-2 lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-sidebar-border px-4 pb-4 lg:hidden">
          <nav className="flex flex-col py-2">
            {links.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="py-3 text-base text-navy-foreground/90">{l.label}</Link>
            ))}
          </nav>
          {user ? (
            <div className="flex gap-2">
              <Button asChild className="flex-1 bg-gold text-accent-foreground hover:bg-gold-soft"><Link to="/account" onClick={() => setOpen(false)}>Account</Link></Button>
              <Button variant="outline" className="flex-1 border-sidebar-border bg-transparent text-navy-foreground" onClick={signOut}>Sign out</Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button asChild variant="outline" className="flex-1 border-sidebar-border bg-transparent text-navy-foreground"><Link to="/login" onClick={() => setOpen(false)}>Log in</Link></Button>
              <Button asChild className="flex-1 bg-gold text-accent-foreground hover:bg-gold-soft"><Link to="/register" onClick={() => setOpen(false)}>Join</Link></Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-navy-deep text-navy-muted">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="text-navy-foreground"><Wordmark /></div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed">
            One membership. Exclusive benefits at trusted cafés, restaurants, hotels, salons and lifestyle partners.
          </p>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold">Quick links</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/partners" className="hover:text-navy-foreground">Partners</Link></li>
            <li><Link to="/how-it-works" className="hover:text-navy-foreground">How It Works</Link></li>
            <li><Link to="/" hash="pricing" className="hover:text-navy-foreground">Membership</Link></li>
            <li><Link to="/" hash="faq" className="hover:text-navy-foreground">FAQ</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold">Company</p>
          <ul className="space-y-2 text-sm">
            <li><a href="mailto:support@pennygrade.com" className="hover:text-navy-foreground">Contact</a></li>
            <li><Link to="/terms" className="hover:text-navy-foreground">Terms & Conditions</Link></li>
            <li><Link to="/privacy" className="hover:text-navy-foreground">Privacy Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-sidebar-border py-6 text-center text-xs">© {new Date().getFullYear()} PennyGrade. All rights reserved.</div>
    </footer>
  );
}

export function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function PartnerCard({ p }: { p: PublicPartner }) {
  const offer = p.offers[0];
  return (
    <Link to="/partners/$slug" params={{ slug: p.slug }}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-card transition-transform hover:-translate-y-0.5">
      <div className="relative h-36 bg-muted">
        {p.cover_image_url && <img src={p.cover_image_url} alt="" loading="lazy" className="h-full w-full object-cover" />}
        <div className="absolute bottom-0 left-4 translate-y-1/2">
          {p.logo_url ? (
            <img src={p.logo_url} alt="" className="h-12 w-12 rounded-xl border-2 border-card object-cover" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-card bg-navy font-display text-lg font-semibold text-gold">
              {p.business_name[0]}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4 pt-8">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold leading-tight">{p.business_name}</h3>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              {p.category?.name}{p.city && <><span>·</span><MapPin className="h-3 w-3" />{p.city}</>}
            </p>
          </div>
        </div>
        {p.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
        <div className="mt-auto flex items-end justify-between pt-4">
          {offer ? (
            <div>
              <p className="font-display text-xl font-bold text-primary">{offerHeadline(offer)}</p>
              <p className="text-xs text-muted-foreground">{offerSub(offer)}</p>
            </div>
          ) : <p className="text-sm text-muted-foreground">No active offer</p>}
          <span className="flex items-center gap-1 text-sm font-medium text-primary group-hover:text-accent-foreground">
            View Offer <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function PartnerCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="h-36 animate-pulse bg-muted" />
      <div className="space-y-2 p-4 pt-8">
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-6 w-1/2 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export function PageHero({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <section className="bg-navy-deep text-navy-foreground">
      <div className="mx-auto max-w-6xl px-4 py-14">
        {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold">{eyebrow}</p>}
        <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>
        {children && <div className="mt-3 max-w-2xl text-navy-muted">{children}</div>}
      </div>
    </section>
  );
}

export { LogoMark };
