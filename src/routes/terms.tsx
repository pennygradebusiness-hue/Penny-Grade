import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/site";
import { buildPageHead, buildBreadcrumbSchema } from "@/lib/seo";

export const Route = createFileRoute("/terms")({
  head: () =>
    buildPageHead({
      title: "Terms & Conditions | PennyGrade Membership",
      description:
        "Terms and conditions governing PennyGrade physical memberships, in-person discount verification rules, and partner venue guidelines.",
      path: "/terms",
      jsonLd: buildBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Terms & Conditions", path: "/terms" },
      ]),
    }),
  component: () => (
    <SiteLayout>
      <PageHero title="Terms & Conditions" breadcrumbs={[{ label: "Terms & Conditions" }]} />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-muted-foreground">
        <p>PennyGrade memberships are personal and non-transferable. Benefits apply only at active partner businesses and only within each offer's stated conditions.</p>
        <p>Discounts are applied by the partner at the time of billing on presentation of a valid live verification screen. Screenshots or expired verifications are not valid.</p>
        <p>PennyGrade may suspend memberships in cases of misuse. Partners participate under a separate PennyGrade partner agreement.</p>
        <p className="text-xs">This is placeholder text — please replace it with your final legal terms.</p>
      </div>
    </SiteLayout>
  ),
});
