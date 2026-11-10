import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, ShoppingBag, Trash2, Truck } from "lucide-react";
import { SiteLayout } from "@/components/site";
import { PhysicalCardPreview } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/format";
import { setMembershipCardInCart } from "@/lib/product-cart";
import { buildBreadcrumbSchema, buildPageHead } from "@/lib/seo";
import { getPublicStorefrontMembershipProduct } from "@/lib/orders.functions";
import { getMembershipCartPlanId } from "@/lib/product-cart";

export const Route = createFileRoute("/cart")({
  loader: () => getPublicStorefrontMembershipProduct(),
  head: () =>
    buildPageHead({
      title: "Your Cart | PennyGrade",
      description: "Review your PennyGrade membership card before entering checkout details.",
      path: "/cart",
      noindex: true,
      jsonLd: buildBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Cart", path: "/cart" },
      ]),
    }),
  component: CartPage,
});

function CartPage() {
  const navigate = useNavigate();
  const product = Route.useLoaderData();
  const [hasItem, setHasItem] = useState(false);

  useEffect(() => {
    const planId = getMembershipCartPlanId();
    setHasItem(Boolean(product && planId === product.plan.id));
    if (planId && (!product || planId !== product.plan.id)) setMembershipCardInCart(null);
  }, [product]);

  const removeItem = () => {
    setMembershipCardInCart(null);
    setHasItem(false);
  };

  return (
    <SiteLayout>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-black text-slate-950">Your Cart</h1>
        <p className="mt-2 text-sm text-slate-600">Review the product and current price before checkout.</p>

        {!hasItem ? (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-amber-600" />
            <h2 className="mt-3 text-xl font-bold text-slate-900">Your cart is empty</h2>
            <p className="mt-2 text-sm text-slate-600">Browse the PennyGrade physical membership card to add it to your cart.</p>
            <Button onClick={() => navigate({ to: "/membership-card" })} className="mt-5 bg-amber-500 text-white hover:bg-amber-600">
              View Membership Card <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </section>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row">
                <div className="w-full rounded-xl bg-slate-950 p-3 sm:w-52 sm:shrink-0">
                  <PhysicalCardPreview interactive={false} className="shadow-lg" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-slate-950">{product?.plan.name || "PennyGrade 6-Month Membership Card"}</h2>
                  <p className="mt-2 text-sm text-slate-600">One physical card · six months of membership access</p>
                  <p className="mt-3 text-sm font-semibold text-slate-800">Quantity: 1</p>
                  <p className="mt-1 text-sm text-slate-600">Delivery currently limited to Daltonganj, Jharkhand.</p>
                  <Button variant="ghost" onClick={removeItem} className="mt-4 px-0 text-red-700 hover:bg-transparent hover:text-red-800">
                    <Trash2 className="mr-2 h-4 w-4" /> Remove
                  </Button>
                </div>
                <strong className="text-xl font-black text-slate-950">{product ? inr(product.plan.price) : "Price unavailable"}</strong>
              </div>
            </section>

            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <h2 className="font-bold text-slate-950">Order summary</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between text-slate-600"><span>Membership card</span><span>{product ? inr(product.plan.price) : "—"}</span></div>
                <div className="flex justify-between text-slate-600"><span className="flex items-center gap-1"><Truck className="h-4 w-4" /> Delivery</span><span>No separate fee shown</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-extrabold text-slate-950"><span>Total</span><span>{product ? inr(product.plan.price) : "—"}</span></div>
              </div>
              <Button disabled={!product || !product.paymentEnabled || product.availability !== "IN_STOCK"} onClick={() => product && navigate({ to: "/checkout", search: { planId: product.plan.id } })} className="mt-5 min-h-12 w-full bg-gradient-to-r from-amber-500 to-orange-500 font-extrabold text-white hover:from-amber-600 hover:to-orange-600">
                Continue to Checkout <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              {(!product?.paymentEnabled || product.availability !== "IN_STOCK") && <p role="status" className="mt-3 text-xs text-amber-900">{!product?.paymentEnabled ? "Online payment is currently unavailable." : product?.availability === "OUT_OF_STOCK" ? "Currently out of stock." : "Availability could not be confirmed. Try again later."}</p>}
              <p className="mt-3 text-xs leading-5 text-slate-500">Availability is checked before payment is initialized. Review the <Link to="/shipping-policy" className="underline">shipping</Link> and <Link to="/refund-policy" className="underline">refund</Link> policies before ordering.</p>
            </aside>
          </div>
        )}
      </main>
    </SiteLayout>
  );
}
