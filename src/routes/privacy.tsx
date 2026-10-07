import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/site";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | PennyGrade" },
      { name: "description", content: "How PennyGrade collects and protects member information." },
      { property: "og:title", content: "PennyGrade Privacy Policy" },
      { property: "og:description", content: "How PennyGrade collects and protects member information." },
    ],
  }),
  component: () => (
    <SiteLayout>
      <PageHero title="Privacy Policy" />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-muted-foreground">
        <p>We store your name, email, mobile number and membership details to provide PennyGrade benefits. Verification activity is recorded for auditing and partner reporting.</p>
        <p>Partner staff only see what is on your live verification screen. We never share your contact details with partners.</p>
        <p className="text-xs">This is placeholder text — please replace it with your final privacy policy.</p>
      </div>
    </SiteLayout>
  ),
});
