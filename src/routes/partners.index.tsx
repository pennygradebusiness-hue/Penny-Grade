import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Search } from "lucide-react";
import { SiteLayout, PageHero, PartnerCard, PartnerCardSkeleton } from "@/components/site";
import { EmptyState } from "@/components/brand";
import { Input } from "@/components/ui/input";
import { categoriesQuery, partnersQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

const search = z.object({ category: z.string().optional(), featured: z.boolean().optional(), city: z.string().optional() });

export const Route = createFileRoute("/partners/")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Partner Directory | PennyGrade" },
      { name: "description", content: "Browse PennyGrade partner cafés, restaurants, hotels, salons, gyms and more offering member discounts." },
      { property: "og:title", content: "PennyGrade Partners" },
      { property: "og:description", content: "Discover businesses offering exclusive PennyGrade member discounts." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(partnersQuery), context.queryClient.ensureQueryData(categoriesQuery)]),
  pendingComponent: () => (
    <SiteLayout><div className="mx-auto grid max-w-6xl gap-5 px-4 py-14 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <PartnerCardSkeleton key={i} />)}</div></SiteLayout>
  ),
  component: Partners,
});

function Partners() {
  const { data: partners } = useSuspenseQuery(partnersQuery);
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/partners/" });
  const [q, setQ] = useState("");
  const [withOffer, setWithOffer] = useState(false);
  const cities = useMemo(() => [...new Set(partners.map((p) => p.city).filter(Boolean))] as string[], [partners]);

  const list = partners.filter((p) => {
    if (s.category && p.category?.slug !== s.category) return false;
    if (s.featured && !p.featured) return false;
    if (s.city && p.city !== s.city) return false;
    if (withOffer && !p.offers.length) return false;
    if (q && !`${p.business_name} ${p.description} ${p.category?.name} ${p.city}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const chip = (active: boolean) =>
    cn("whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition-colors", active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-accent");

  return (
    <SiteLayout>
      <PageHero eyebrow="Partner directory" title="Find a PennyGrade partner">Visit any partner below and scan the PennyGrade QR at the counter.</PageHero>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search partners, categories, cities" className="h-11 bg-card pl-9" />
          </div>
          {cities.length > 1 && (
            <select value={s.city ?? ""} onChange={(e) => navigate({ search: { ...s, city: e.target.value || undefined } })}
              className="h-11 rounded-md border bg-card px-3 text-sm">
              <option value="">All cities</option>
              {cities.map((c) => <option key={c}>{c}</option>)}
            </select>
          )}
        </div>
        <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-2">
          <button className={chip(!s.category)} onClick={() => navigate({ search: { ...s, category: undefined } })}>All</button>
          {categories.map((c) => (
            <button key={c.id} className={chip(s.category === c.slug)} onClick={() => navigate({ search: { ...s, category: c.slug } })}>{c.name}</button>
          ))}
          <span className="mx-1 w-px shrink-0 bg-border" />
          <button className={chip(!!s.featured)} onClick={() => navigate({ search: { ...s, featured: s.featured ? undefined : true } })}>Featured</button>
          <button className={chip(withOffer)} onClick={() => setWithOffer(!withOffer)}>With offers</button>
        </div>
        <div className="mt-6">
          {list.length === 0 ? (
            <EmptyState title="No partner businesses are available yet." >Try a different search or filter.</EmptyState>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{list.map((p) => <PartnerCard key={p.id} p={p} />)}</div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
