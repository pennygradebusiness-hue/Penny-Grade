import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, MapPin, ShieldCheck, ShoppingCart, Truck } from "lucide-react";
import { SiteLayout } from "@/components/site";
import { PhysicalCardPreview } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/format";
import { isMembershipCardInCart, setMembershipCardInCart } from "@/lib/product-cart";
import { buildBreadcrumbSchema, buildPageHead, getSiteUrl } from "@/lib/seo";

export const Route = createFileRoute("/membership-card")({
  head: () =>
    buildPageHead({
      title: "PennyGrade 6-Month Membership Card | ₹500",
      description:
        "Shop the PennyGrade physical six-month membership card for ₹500. Review included membership access, Daltonganj delivery, and partner offer terms before ordering.",
      path: "/membership-card",
      jsonLd: [
        buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Membership Card", path: "/membership-card" },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "Product",
          name: "PennyGrade 6-Month Membership Card",
          description:
            "One physical PennyGrade membership card with six months of membership access to participating local businesses and their listed member benefits.",
          brand: { "@type": "Brand", name: "PennyGrade" },
          image: `${getSiteUrl()}/pennygrade-card.webp`,
          offers: {
            "@type": "Offer",
            priceCurrency: "INR",
            price: "500",
            url: `${getSiteUrl()}/membership-card`,
          },
        },
      ],
    }),
  component: MembershipCardProductPage,
});

function MembershipCardProductPage() {
  const navigate = useNavigate();
  const [inCart, setInCart] = useState(false);

  useEffect(() => setInCart(isMembershipCardInCart()), []);

  const addToCart = () => {
    setMembershipCardInCart(true);
    setInCart(true);
  };

  return (
    <SiteLayout>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-14 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-slate-500">
          <Link to="/" className="hover:text-amber-700">Home</Link>
          <span className="px-2">/</span>
          <span aria-current="page" className="font-semibold text-slate-800">Membership Card</span>
        </nav>

        <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-14">
          <div className="rounded-3xl bg-slate-950 p-4 shadow-xl sm:p-8">
            <PhysicalCardPreview priority className="mx-auto max-w-[560px] shadow-2xl" />
            <p className="mt-4 text-center text-xs text-slate-300">
              Product preview. The delivered card is physical; the membership number is assigned from available card inventory after payment verification.
            </p>
          </div>

          <section>
            <p className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">
              PennyGrade membership product
            </p>
            <h1 className="mt-4 font-display text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              PennyGrade 6-Month Membership Card
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              One physical membership card with six months of access to PennyGrade membership features, the participating business directory, and the benefits shown on each partner listing.
            </p>

            <div className="mt-6 flex items-baseline gap-3">
              <span className="text-3xl font-black text-slate-950">{inr(500)}</span>
              <span className="text-sm text-slate-500">one card · six months</span>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-bold text-slate-900">What this purchase includes</h2>
              <ul className="mt-3 space-y-3 text-sm text-slate-700">
                {[
                  "One physical PennyGrade membership card",
                  "Six months of membership access from card activation",
                  "Access to participating business listings and their current member benefits",
                  "Online membership verification where supported",
                  "Membership and order support by email and phone",
                ].map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="flex gap-3 rounded-xl bg-slate-50 p-4 text-sm">
                <MapPin className="h-5 w-5 shrink-0 text-amber-600" />
                <span><strong className="block text-slate-900">Delivery area</strong>Daltonganj, Jharkhand</span>
              </div>
              <div className="flex gap-3 rounded-xl bg-slate-50 p-4 text-sm">
                <Truck className="h-5 w-5 shrink-0 text-amber-600" />
                <span><strong className="block text-slate-900">Delivery charge</strong>No separate shipping fee is currently shown at checkout</span>
              </div>
            </div>

            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              Card availability is checked before payment is initialized. PennyGrade confirms the card assignment after payment verification. Delivery timing is not guaranteed; contact support before ordering if you need a current estimate.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button onClick={addToCart} variant="outline" className="min-h-12 flex-1 border-slate-300 text-slate-900">
                <ShoppingCart className="mr-2 h-4 w-4" />
                {inCart ? "Added to Cart" : "Add to Cart"}
              </Button>
              <Button
                onClick={() => navigate({ to: "/checkout" })}
                className="min-h-12 flex-1 bg-gradient-to-r from-amber-500 to-orange-500 font-extrabold text-white hover:from-amber-600 hover:to-orange-600"
              >
                Buy Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            {inCart && (
              <Button
                variant="link"
                onClick={() => navigate({ to: "/cart" })}
                className="mt-2 px-0 text-amber-800"
              >
                View cart and order summary <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            )}

            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200 pt-4 text-xs font-semibold text-slate-600">
              <Link to="/shipping-policy" className="underline underline-offset-2">Shipping &amp; delivery</Link>
              <Link to="/refund-policy" className="underline underline-offset-2">Cancellation &amp; refunds</Link>
              <Link to="/membership-terms" className="underline underline-offset-2">Membership terms</Link>
              <Link to="/partners" className="underline underline-offset-2">Explore partner businesses</Link>
            </div>

            <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              This checkout collects PennyGrade’s membership fee only. Partner businesses independently provide their goods or services, apply their own listed benefits where eligible, and collect payment directly from customers.
            </p>
          </section>
        </div>
      </main>
    </SiteLayout>
  );
}
