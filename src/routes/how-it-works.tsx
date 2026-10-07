import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/site";
import { Button } from "@/components/ui/button";
import { STEPS } from "./index";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works | PennyGrade" },
      { name: "description", content: "Scan the partner QR, enter your bill, show the live verification and save. No apps, no coupons." },
      { property: "og:title", content: "How PennyGrade Works" },
      { property: "og:description", content: "Four simple steps to member savings at PennyGrade partners." },
    ],
  }),
  component: HowItWorks,
});

function HowItWorks() {
  return (
    <SiteLayout>
      <PageHero eyebrow="How it works" title="Save in under a minute">
        You operate everything from your phone. Partner staff simply look at your live verification screen.
      </PageHero>
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ol className="relative space-y-10 border-l-2 border-border pl-8">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative">
              <span className="absolute -left-[3.05rem] flex h-10 w-10 items-center justify-center rounded-full bg-navy text-gold ring-4 ring-background">
                <s.icon className="h-5 w-5" />
              </span>
              <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground/70">Step {i + 1}</p>
              <h2 className="mt-1 text-xl font-semibold">{s.title}</h2>
              <p className="mt-2 text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-14 rounded-2xl border bg-card p-6">
          <h3 className="font-semibold">For partner staff</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            No login, no scanning, no app. Check that the screen shows <strong>LIVE VERIFICATION</strong> with a running countdown,
            your business name, and the final amount — then apply the shown discount in your normal billing.
          </p>
        </div>
        <div className="mt-10 flex gap-3">
          <Button asChild><Link to="/register">Become a Member</Link></Button>
          <Button asChild variant="outline"><Link to="/partners">Explore Partners</Link></Button>
        </div>
      </div>
    </SiteLayout>
  );
}
