import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/site";
import { buildPageHead, buildBreadcrumbSchema } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  head: () =>
    buildPageHead({
      title: "About PennyGrade | Local Membership Network",
      description:
        "PennyGrade is a local membership network connecting members with participating independent businesses in Daltonganj, Jharkhand.",
      path: "/about",
      jsonLd: buildBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "About PennyGrade", path: "/about" },
      ]),
    }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <SiteLayout>
      <PageHero title="About PennyGrade" highlight="Local membership, local businesses">
        PennyGrade is a local privilege and membership network based in Daltonganj, Palamu,
        Jharkhand. We provide a six-month physical membership card and a directory of participating
        independent businesses with their current member benefits.
      </PageHero>
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 text-sm leading-7 text-slate-700 sm:px-6">
        <section>
          <h2 className="text-xl font-bold text-slate-900">What membership includes</h2>
          <p className="mt-2">
            The ₹500 membership includes one physical card and six months of membership access from
            activation. Members can browse participating local businesses, check the offer and
            eligibility terms shown on each listing, and verify membership online where supported.
            Partner offers may change; the listing and partner's stated conditions apply.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-slate-900">How payments work</h2>
          <p className="mt-2">
            PennyGrade collects payment only for its own membership product. When a member visits a
            participating business, that business supplies its own goods or services, applies any
            eligible listed benefit, and collects the bill directly from the member. PennyGrade
            does not collect or split partner bills through this membership checkout.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-slate-900">Local network</h2>
          <p className="mt-2">
            Partner participation is business-specific. Browse the live directory to see current
            participating businesses and each offer's terms. We do not promise a fixed partner
            count or a universal discount rate.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-slate-900">Operator and service area</h2>
          <p className="mt-2">
            PennyGrade is operated by Samir Pandey (proprietor / operating entity), with an
            administrative desk in Daltonganj, Palamu, Jharkhand 822101. Membership card delivery is
            currently available in Daltonganj, Jharkhand. For help, visit our{" "}
            <Link to="/contact" className="font-semibold text-primary underline">
              Contact page
            </Link>
            .
          </p>
        </section>
      </div>
    </SiteLayout>
  );
}
