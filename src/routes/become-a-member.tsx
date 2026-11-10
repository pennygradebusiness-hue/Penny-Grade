import { createFileRoute, redirect } from "@tanstack/react-router";
import { buildPageHead } from "@/lib/seo";

// Keep the legacy URL working while routing customers to the product detail
// page, where the active plan price and purchase availability are authoritative.
export const Route = createFileRoute("/become-a-member")({
  beforeLoad: () => {
    throw redirect({ to: "/membership-card" });
  },
  head: () =>
    buildPageHead({
      title: "Shop the PennyGrade Membership Card",
      description:
        "View the current PennyGrade six-month physical membership card price, availability, delivery area, and terms.",
      path: "/become-a-member",
      noindex: true,
    }),
});
