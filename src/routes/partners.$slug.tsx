import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { MapPin, Clock, Phone, Mail, Globe, QrCode } from "lucide-react";
import { SiteLayout } from "@/components/site";
import { EmptyState } from "@/components/brand";
import { OfferPanel } from "@/components/offer-details";
import { Button } from "@/components/ui/button";
import { partnerQuery } from "@/lib/queries";
import { offerHeadline } from "@/lib/format";

export const Route = createFileRoute("/partners/$slug")({
  loader: async ({ context, params }) => {
    const p = await context.queryClient.ensureQueryData(partnerQuery(params.slug));
    if (!p) throw notFound();
    return { name: p.business_name, desc: p.description, img: p.cover_image_url, offer: p.offers[0] ? offerHeadline(p.offers[0]) : null };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Partner not found | PennyGrade" }, { name: "robots", content: "noindex" }] };
    const title = `${loaderData.name}${loaderData.offer ? ` — ${loaderData.offer}` : ""} | PennyGrade`;
    const desc = loaderData.desc ?? `Exclusive PennyGrade member discount at ${loaderData.name}.`;
    return {
      meta: [
        { title }, { name: "description", content: desc },
        { property: "og:title", content: title }, { property: "og:description", content: desc },
        ...(loaderData.img ? [{ property: "og:image", content: loaderData.img }, { name: "twitter:image", content: loaderData.img }] : []),
      ],
    };
  },
  notFoundComponent: () => (
    <SiteLayout><div className="mx-auto max-w-lg px-4 py-24"><EmptyState title="This PennyGrade partner could not be found."><Link to="/partners" className="underline">Browse partners</Link></EmptyState></div></SiteLayout>
  ),
  errorComponent: () => <SiteLayout><div className="py-24 text-center">Unable to load this partner. Please try again.</div></SiteLayout>,
  pendingComponent: () => <SiteLayout><div className="h-64 animate-pulse bg-muted" /><div className="mx-auto max-w-6xl space-y-3 px-4 py-8"><div className="h-8 w-1/3 animate-pulse rounded bg-muted" /><div className="h-40 animate-pulse rounded-2xl bg-muted" /></div></SiteLayout>,
  component: PartnerPage,
});

function PartnerPage() {
  const { slug } = Route.useParams();
  const { data: p } = useSuspenseQuery(partnerQuery(slug));
  if (!p) return null;
  const offer = p.offers[0];
  return (
    <SiteLayout>
      <div className="relative h-56 bg-navy md:h-72">
        {p.cover_image_url && <img src={p.cover_image_url} alt={p.business_name} className="h-full w-full object-cover opacity-90" />}
      </div>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-[1fr_380px]">
        <div className="-mt-10">
          <div className="flex items-end gap-4">
            {p.logo_url ? <img src={p.logo_url} alt="" className="h-20 w-20 rounded-2xl border-4 border-background object-cover" />
              : <span className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-background bg-navy font-display text-3xl font-semibold text-gold">{p.business_name[0]}</span>}
          </div>
          <p className="mt-4 text-sm font-medium text-accent-foreground/70">{p.category?.name}</p>
          <h1 className="text-3xl font-semibold md:text-4xl">{p.business_name}</h1>
          {p.city && <p className="mt-2 flex items-center gap-1.5 text-muted-foreground"><MapPin className="h-4 w-4" />{[p.address, p.city].filter(Boolean).join(", ")}</p>}
          {p.description && <p className="mt-6 max-w-2xl leading-relaxed">{p.description}</p>}

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {p.business_hours && <Info icon={Clock} label="Business hours" value={p.business_hours} />}
            {p.phone && <Info icon={Phone} label="Phone" value={p.phone} href={`tel:${p.phone}`} />}
            {p.email && <Info icon={Mail} label="Email" value={p.email} href={`mailto:${p.email}`} />}
            {p.website && <Info icon={Globe} label="Website" value={p.website} href={p.website} />}
          </div>
          {p.latitude != null && p.longitude != null && (
            <a className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium underline" target="_blank" rel="noreferrer"
              href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}><MapPin className="h-4 w-4" /> Open in Maps</a>
          )}
        </div>
        <aside className="space-y-4 md:mt-8">
          {offer ? <OfferPanel offer={offer} /> : <EmptyState title="No active offers available right now." />}
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex gap-3"><QrCode className="h-5 w-5 shrink-0 text-accent-foreground" />
              <p className="text-sm text-muted-foreground">Visit this partner and scan the PennyGrade QR displayed at the counter.</p></div>
            <Button asChild className="mt-4 w-full" size="lg"><Link to="/p/$partnerSlug" params={{ partnerSlug: p.slug }}>Get Member Discount</Link></Button>
          </div>
        </aside>
      </div>
    </SiteLayout>
  );
}

function Info({ icon: Icon, label, value, href }: { icon: typeof Clock; label: string; value: string; href?: string }) {
  const body = <><Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium break-all">{value}</p></div></>;
  return href ? <a href={href} className="flex gap-3 rounded-xl border bg-card p-4 hover:border-accent">{body}</a> : <div className="flex gap-3 rounded-xl border bg-card p-4">{body}</div>;
}
