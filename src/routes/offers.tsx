import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SiteLayout, PageHero } from "@/components/site";
import { EmptyState } from "@/components/brand";
import { partnersQuery } from "@/lib/queries";
import { inr, offerHeadline, offerSub } from "@/lib/format";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "Current Member Offers | PennyGrade" },
      { name: "description", content: "Every active PennyGrade member discount across partner cafés, restaurants, hotels, salons and more." },
      { property: "og:title", content: "PennyGrade Member Offers" },
      { property: "og:description", content: "All current exclusive discounts for PennyGrade members." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(partnersQuery),
  component: Offers,
});

function Offers() {
  const { data } = useSuspenseQuery(partnersQuery);
  const rows = data.flatMap((p) => p.offers.map((o) => ({ p, o })));
  return (
    <SiteLayout>
      <PageHero eyebrow="Offers" title="Current member offers">Unlimited eligible use on every visit.</PageHero>
      <div className="mx-auto max-w-6xl px-4 py-10">
        {rows.length === 0 ? <EmptyState title="No active offers available right now." /> : (
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map(({ p, o }) => (
              <Link key={o.id} to="/partners/$slug" params={{ slug: p.slug }} className="flex items-center gap-5 rounded-2xl border bg-card p-5 shadow-card hover:border-accent">
                <div className="w-28 shrink-0 rounded-xl bg-navy px-3 py-4 text-center">
                  <p className="font-display text-xl font-bold leading-tight text-gold">{offerHeadline(o)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{p.category?.name}{p.city ? ` · ${p.city}` : ""}</p>
                  <p className="font-semibold">{p.business_name}</p>
                  <p className="text-sm text-muted-foreground">{offerSub(o)}{Number(o.minimum_bill) > 0 ? ` · Min bill ${inr(o.minimum_bill)}` : ""}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
