import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, MapPin, QrCode, Store } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site";
import { Button } from "@/components/ui/button";
import { partnersQuery } from "@/lib/queries";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/verify")({
  head: () =>
    buildPageHead({
      title: "Verify a PennyGrade Discount | Choose a Partner",
      description: "Choose the partner venue whose counter QR code you scanned to continue PennyGrade member verification.",
      path: "/verify",
    }),
  loader: ({ context }) => context.queryClient.ensureQueryData(partnersQuery),
  component: VerifyEntryPage,
});

function VerifyEntryPage() {
  const { data: partners } = useSuspenseQuery(partnersQuery);

  return (
    <SiteLayout>
      <PageHero title="Verify a Member Discount" breadcrumbs={[{ label: "Verify" }]} />
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <QrCode className="mt-1 h-6 w-6 shrink-0 text-amber-700" aria-hidden="true" />
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">Continue from the venue counter</h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Scan the PennyGrade counter QR code at the partner venue. If you opened this page directly, choose that venue below to continue to its existing membership and bill verification form. The final discount is calculated by PennyGrade’s server.
              </p>
            </div>
          </div>
        </section>

        <h2 className="mt-8 font-display text-xl font-bold text-slate-900">Choose a partner venue</h2>
        {partners.length === 0 ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            No active partner venues are available right now. Please try again later or contact support.
          </div>
        ) : (
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {partners.map((partner) => (
              <li key={partner.id} className="flex min-w-0 items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{partner.business_name}</p>
                  <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                    {partner.category?.name ? <Store className="h-3.5 w-3.5" aria-hidden="true" /> : <MapPin className="h-3.5 w-3.5" aria-hidden="true" />}
                    <span className="min-w-0 truncate">{[partner.category?.name, partner.city].filter(Boolean).join(" · ") || "PennyGrade partner"}</span>
                  </p>
                </div>
                <Button asChild size="sm" className="shrink-0">
                  <Link to="/p/$partnerSlug" params={{ partnerSlug: partner.slug }}>
                    Continue <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </SiteLayout>
  );
}
