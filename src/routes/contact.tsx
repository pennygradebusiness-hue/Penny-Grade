import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/site";
import { buildPageHead, buildBreadcrumbSchema } from "@/lib/seo";

export const Route = createFileRoute("/contact")({
  head: () =>
    buildPageHead({
      title: "Contact PennyGrade | Member and Order Support",
      description:
        "Contact PennyGrade in Daltonganj for membership, delivery, refund, payment, and partner enquiries.",
      path: "/contact",
      jsonLd: buildBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Contact", path: "/contact" },
      ]),
    }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <SiteLayout>
      <PageHero title="Contact PennyGrade" highlight="We're here to help">
        Contact us about membership, card delivery, payments, refunds, or partner participation.
        Include your order reference when asking about an order.
      </PageHero>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold text-slate-900">Customer support</h2>
            <p className="mt-3 text-sm text-slate-600">Email</p>
            <a className="font-semibold text-primary underline" href="mailto:pennygradebusiness@gmail.com">pennygradebusiness@gmail.com</a>
            <p className="mt-4 text-sm text-slate-600">Phone</p>
            <a className="font-semibold text-primary underline" href="tel:+919356897893">+91 93568 97893</a>
            <p className="mt-4 text-sm text-slate-600">Support location</p>
            <p className="font-medium text-slate-900">Daltonganj, Palamu, Jharkhand 822101, India</p>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold text-slate-900">Partner enquiries</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Local businesses interested in joining the directory can contact us by email or phone.
              Offers are published for individual partners after their terms have been agreed and
              recorded.
            </p>
            <a className="mt-4 inline-block font-semibold text-primary underline" href="mailto:pennygradebusiness@gmail.com?subject=PennyGrade%20partner%20enquiry">Email about partnering</a>
          </section>
        </div>
      </div>
    </SiteLayout>
  );
}
