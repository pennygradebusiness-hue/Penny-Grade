import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Check, ShieldCheck, Infinity as InfinityIcon, Smartphone } from "lucide-react";
import { SiteLayout, PartnerCard } from "@/components/site";
import { LOGO_URL } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { categoriesQuery, partnersQuery, categoryIcon } from "@/lib/queries";
import { offerHeadline, offerSub } from "@/lib/format";
import { STEPS } from "@/lib/steps";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PennyGrade | Exclusive Membership Benefits" },
      { name: "description", content: "Join PennyGrade and unlock exclusive savings at trusted cafés, restaurants, hotels, salons and more. ₹500/year." },
      { property: "og:title", content: "PennyGrade | One Membership. Exclusive Benefits." },
      { property: "og:description", content: "Unlock exclusive savings across trusted local and lifestyle partners." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(partnersQuery), context.queryClient.ensureQueryData(categoriesQuery)]),
  component: Home,
});


const FAQ = [
  ["How do I use my discount?", "At a partner, scan the PennyGrade QR at the counter, enter your bill amount and show the live verification screen to staff. They apply the discount in their normal billing."],
  ["Do I need to enter my membership number every time?", "No. Once you're logged in, PennyGrade recognises your membership automatically."],
  ["Can I use an offer more than once?", "Yes. Offers are unlimited by default — use them on every eligible visit, subject to each offer's conditions."],
  ["How do I become a member?", "Membership is ₹500 per year. Create an account and our team activates your membership and issues your physical card."],
  ["Does the partner need an app?", "No. Partners only display the PennyGrade QR. Staff simply check your live verification screen."],
];

function Home() {
  const { data: partners } = useSuspenseQuery(partnersQuery);
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  const featured = partners.filter((p) => p.featured).slice(0, 6);
  const offers = partners.filter((p) => p.offers[0]).slice(0, 4);

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-deep text-navy-foreground">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 md:grid-cols-2 md:pb-24 md:pt-20">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/30 px-3 py-1 text-xs font-medium tracking-wide text-gold">
              <ShieldCheck className="h-3.5 w-3.5" /> Trusted partner benefits network
            </p>
            <h1 className="text-4xl font-semibold leading-[1.05] md:text-6xl">
              One Membership.<br /><span className="text-gold-gradient">Exclusive Benefits.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-navy-muted">
              Join PennyGrade and unlock exclusive savings at trusted partner businesses across your city and beyond.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-gold text-accent-foreground hover:bg-gold-soft"><Link to="/register">Become a Member</Link></Button>
              <Button asChild size="lg" variant="outline" className="border-navy-foreground/20 bg-transparent text-navy-foreground hover:bg-sidebar-accent hover:text-navy-foreground"><Link to="/partners">Explore Partners</Link></Button>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="aspect-[1.586/1] overflow-hidden rounded-2xl shadow-2xl ring-1 ring-gold/30">
              <div className="relative h-full w-full">
                <img src={LOGO_URL} alt="PennyGrade" className="absolute inset-0 h-full w-full object-cover object-[50%_40%]" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-gold">Premium Membership</p>
                    <p className="mt-1 font-mono text-sm tracking-widest text-navy-foreground/90">PEN-••••-92LM</p>
                  </div>
                  <p className="font-display text-sm font-semibold text-gold">PennyGrade</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <SectionTitle eyebrow="How PennyGrade works" title="Four simple steps to save" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-2xl border bg-card p-6 shadow-card">
              <div className="mb-5 flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-gold"><s.icon className="h-5 w-5" /></span>
                <span className="font-display text-3xl font-bold text-border">0{i + 1}</span>
              </div>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-secondary/60">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-20 md:grid-cols-3">
          {[
            { icon: InfinityIcon, t: "Unlimited eligible use", b: "Use your partner offers on every eligible visit — no one-time coupons." },
            { icon: Smartphone, t: "Nothing to install", b: "Works in your phone's browser. Scan, enter your bill, show the screen." },
            { icon: ShieldCheck, t: "Secure live verification", b: "Every verification is generated live and expires in minutes." },
          ].map((b) => (
            <div key={b.t} className="flex gap-4">
              <b.icon className="mt-1 h-6 w-6 shrink-0 text-accent-foreground" />
              <div><h3 className="font-semibold">{b.t}</h3><p className="mt-1 text-sm text-muted-foreground">{b.b}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <SectionTitle eyebrow="Partner categories" title="Savings across your lifestyle" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {categories.map((c) => {
            const Icon = categoryIcon(c.icon);
            return (
              <Link key={c.id} to="/partners" search={{ category: c.slug }} className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-accent">
                <Icon className="h-5 w-5 text-accent-foreground" /><span className="text-sm font-medium">{c.name}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured partners */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="flex items-end justify-between"><SectionTitle eyebrow="Featured" title="Featured partners" />
            <Link to="/partners" className="mb-10 text-sm font-medium text-primary underline-offset-4 hover:underline">View all</Link></div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{featured.map((p) => <PartnerCard key={p.id} p={p} />)}</div>
        </section>
      )}

      {/* Featured offers */}
      {offers.length > 0 && (
        <section className="bg-navy-deep text-navy-foreground">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <SectionTitle eyebrow="Featured offers" title="Member-only savings" dark />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {offers.map((p) => (
                <Link key={p.id} to="/partners/$slug" params={{ slug: p.slug }} className="rounded-2xl border border-sidebar-border bg-navy p-5 transition-colors hover:border-gold/50">
                  <p className="text-xs uppercase tracking-widest text-navy-muted">{p.category?.name}</p>
                  <p className="mt-1 font-semibold">{p.business_name}</p>
                  <p className="mt-4 font-display text-3xl font-bold text-gold">{offerHeadline(p.offers[0])}</p>
                  <p className="text-sm text-navy-muted">{offerSub(p.offers[0])}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <div className="mx-auto max-w-lg rounded-3xl border bg-card p-8 text-center shadow-card md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-foreground/70">Membership</p>
          <h2 className="mt-2 text-2xl font-semibold">PennyGrade Membership</h2>
          <p className="mt-6 font-display text-5xl font-bold">₹500<span className="text-lg font-medium text-muted-foreground"> / year</span></p>
          <ul className="mx-auto mt-8 max-w-xs space-y-3 text-left text-sm">
            {["Exclusive partner discounts", "Access to participating businesses", "Digital membership verification", "Unlimited eligible offer usage", "Growing partner network"].map((b) => (
              <li key={b} className="flex items-center gap-3"><Check className="h-4 w-4 text-success" />{b}</li>
            ))}
          </ul>
          <Button asChild size="lg" className="mt-8 w-full"><Link to="/register">Become a Member</Link></Button>
          <p className="mt-3 text-xs text-muted-foreground">Memberships are activated by the PennyGrade team after registration.</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 pb-10">
        <SectionTitle eyebrow="FAQ" title="Questions, answered" />
        <Accordion type="single" collapsible className="rounded-2xl border bg-card px-5">
          {FAQ.map(([q, a]) => (
            <AccordionItem key={q} value={q}><AccordionTrigger className="text-left">{q}</AccordionTrigger><AccordionContent className="text-muted-foreground">{a}</AccordionContent></AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 pt-14">
        <div className="flex flex-col items-center justify-between gap-6 rounded-3xl bg-navy px-8 py-12 text-navy-foreground md:flex-row">
          <div><h2 className="text-2xl font-semibold md:text-3xl">Start saving with PennyGrade</h2><p className="mt-2 text-navy-muted">One membership. Every partner. All year.</p></div>
          <Button asChild size="lg" className="bg-gold text-accent-foreground hover:bg-gold-soft"><Link to="/register">Become a Member</Link></Button>
        </div>
      </section>
    </SiteLayout>
  );
}

function SectionTitle({ eyebrow, title, dark }: { eyebrow: string; title: string; dark?: boolean }) {
  return (
    <div className="mb-10">
      <p className={`mb-2 text-xs font-semibold uppercase tracking-[0.2em] ${dark ? "text-gold" : "text-accent-foreground/70"}`}>{eyebrow}</p>
      <h2 className="text-2xl font-semibold md:text-3xl">{title}</h2>
    </div>
  );
}
