import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/site";
import { buildPageHead, buildBreadcrumbSchema } from "@/lib/seo";

export const Route = createFileRoute("/privacy")({
  head: () =>
    buildPageHead({
      title: "Privacy Policy | PennyGrade Customer Data Protection",
      description:
        "Learn how PennyGrade protects member information, ensures zero contact sharing with venue staff, and maintains strict data privacy standards.",
      path: "/privacy",
      jsonLd: buildBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Privacy Policy", path: "/privacy" },
      ]),
    }),
  component: () => (
    <SiteLayout>
      <PageHero title="Privacy Policy" breadcrumbs={[{ label: "Privacy Policy" }]} />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-muted-foreground">
        <p>
          We store your name, email, mobile number and membership details to provide PennyGrade
          benefits. Verification activity is recorded for auditing and partner reporting.
        </p>
        <p>
          Partner staff only see what is on your live verification screen. We never share your
          contact details with partners.
        </p>
        <p className="text-xs">
          This is placeholder text — please replace it with your final privacy policy.
        </p>
      </div>
    </SiteLayout>
  ),
});
