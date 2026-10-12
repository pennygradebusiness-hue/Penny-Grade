import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Percent, Store, Gift, MapPin, ArrowRight, ShieldCheck } from "lucide-react";
import { SiteLayout, PageHero, Breadcrumbs } from "@/components/site";
import { EmptyState } from "@/components/brand";
import { partnersQuery } from "@/lib/queries";
import { inr, offerHeadline, offerSub } from "@/lib/format";

import { buildPageHead, buildBreadcrumbSchema } from "@/lib/seo";

export const Route = createFileRoute("/offers")({
  head: () =>
    buildPageHead({
      title: "Current Member Offers | PennyGrade Partner Discounts",
      description:
        "Browse all active PennyGrade member discount offers across partner cafés, restaurants, hotels, salons, and retail stores in Daltonganj.",
      path: "/offers",
      jsonLd: buildBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Offers", path: "/offers" },
      ]),
    }),
  loader: ({ context }) => context.queryClient.ensureQueryData(partnersQuery),
  component: Offers,
});

function Offers() {
  const { data } = useSuspenseQuery(partnersQuery);
  const rows = data.flatMap((p) => p.offers.map((o) => ({ p, o })));

  return (
    <SiteLayout>
      <PageHero
        breadcrumbs={[{ label: "Offers" }]}
        eyebrow="Privilege Catalog"
        title="Current Member Offers:"
        highlight="Save Every Visit"
      >
        All active partner privileges available to PennyGrade physical cardholders. Unlimited
        eligible redemptions across all outlets.
      </PageHero>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {/* Top Info Banner */}
        <div className="mb-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:px-6 shadow-xs">
          <div className="flex items-center gap-3">
            <Gift className="h-5 w-5 text-amber-500 shrink-0" />
            <span className="text-xs font-bold text-slate-900">
              Showing {rows.length} verified member discount offers across participating partner
              outlets.
            </span>
          </div>
          <span className="rounded-full bg-white px-3.5 py-1 text-[11px] font-extrabold text-slate-800 shadow-xs border border-slate-200">
            Valid 6 Months (180 Days)
          </span>
        </div>

        {rows.length === 0 ? (
          <EmptyState title="No active offers currently published.">
            Check back soon as new partner discounts are regularly added!
          </EmptyState>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {rows.map(({ p, o }) => (
              <Link
                key={o.id}
                to="/partners/$slug"
                params={{ slug: p.slug }}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-amber-400 hover:shadow-lift"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                        {p.category?.name || "Member Partner"}
                      </span>
                      {p.city && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                          <MapPin className="h-3 w-3 text-amber-500" />
                          {p.city}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 font-display text-lg font-bold text-slate-900 transition-colors group-hover:text-amber-600">
                      {p.business_name}
                    </h3>
                    <p className="mt-1 text-xs font-medium text-slate-500">{o.title}</p>
                  </div>

                  {/* Bold Discount Callout Box */}
                  <div className="shrink-0 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/60 px-5 py-3 text-center shadow-xs">
                    <p className="font-display text-2xl font-extrabold text-slate-900">
                      {offerHeadline(o)}
                    </p>
                    <p className="text-[10px] font-extrabold text-amber-600 uppercase tracking-wider">
                      Discount
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold">
                  <span className="text-slate-500">
                    {Number(o.minimum_bill) > 0
                      ? `Min. bill: ${inr(o.minimum_bill)}`
                      : "No minimum bill required"}
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                    Redeem at Outlet <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
