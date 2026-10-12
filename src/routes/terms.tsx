import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/site";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions | PennyGrade" },
      { name: "description", content: "Terms governing PennyGrade memberships and partner benefits." },
      { property: "og:title", content: "PennyGrade Terms & Conditions" },
      { property: "og:description", content: "Terms governing PennyGrade memberships and partner benefits." },
    ],
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
