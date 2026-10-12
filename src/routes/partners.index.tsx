import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect, useRef } from "react";
import { z } from "zod";
import {
  Search,
  MapPin,
  Store,
  Gift,
  Users,
  ShieldCheck,
  ArrowRight,
  Coffee,
  Utensils,
  BedDouble,
  Scissors,
  Dumbbell,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  ChevronDown,
  Home,
  CreditCard,
  User,
  LayoutGrid,
  X,
  RotateCcw,
  Tag,
  Percent,
  Check,
} from "lucide-react";
import { SiteLayout, PartnerCard, PartnerCardSkeleton } from "@/components/site";
import { EmptyState, CARD_URL } from "@/components/brand";
import { categoriesQuery, partnersQuery } from "@/lib/queries";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { inr } from "@/lib/format";
import type { PublicPartner } from "@/lib/public.functions";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
  discountMin: z.number().optional(),
  minBill: z.string().optional(),
  offerType: z.string().optional(),
  featured: z.boolean().optional(),
  withOffer: z.boolean().optional(),
  sort: z.string().optional(),
});

export const Route = createFileRoute("/partners/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Partner Businesses | PennyGrade" },
      {
        name: "description",
        content:
          "Discover restaurants, cafés, hotels, salons and more in Daltonganj. Unlock exclusive benefits with your PennyGrade membership.",
      },
      { property: "og:title", content: "Partner Businesses | PennyGrade Perks" },
      {
        property: "og:description",
        content:
          "Explore verified restaurants, cafés, hotels, salons and more with exclusive PennyGrade member discounts.",
      },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(partnersQuery),
      context.queryClient.ensureQueryData(categoriesQuery),
    ]),
  pendingComponent: () => (
    <SiteLayout>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-14 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <PartnerCardSkeleton key={i} />
        ))}
      </div>
    </SiteLayout>
  ),
  component: Partners,
});

/* -------------------------------------------------------------------------- */
/*                               SEARCH SYNONYMS                              */
/* -------------------------------------------------------------------------- */

const SEARCH_SYNONYMS: Record<string, string[]> = {
  coffee: ["café", "cafe", "bakery", "espresso", "latte", "cappuccino", "tea", "beverage", "breakfast"],
  cafe: ["coffee", "bakery", "beverage", "tea", "snack"],
  café: ["coffee", "bakery", "beverage", "tea", "snack"],
  food: ["restaurant", "dining", "cuisine", "dinner", "lunch", "meal", "biryani", "thali", "eats", "dhaba"],
  dining: ["restaurant", "cafe", "bistro", "food", "dinner", "lunch"],
  restaurant: ["food", "dining", "dinner", "lunch", "meal", "cuisine"],
  stay: ["hotel", "room", "resort", "inn", "lodge", "suite", "accommodation"],
  hotel: ["stay", "room", "resort", "inn", "lodge", "night"],
  salon: ["hair", "haircut", "beauty", "spa", "parlour", "facial", "grooming", "stylist", "makeup"],
  spa: ["salon", "massage", "wellness", "beauty"],
  gym: ["fitness", "workout", "trainer", "exercise", "yoga", "crossfit", "weights"],
  fitness: ["gym", "workout", "trainer", "exercise", "yoga"],
  shopping: ["store", "retail", "apparel", "clothing", "fashion", "boutique", "market", "wear"],
  retail: ["store", "shopping", "clothes", "apparel"],
};

/* Quick hero category shortcuts */
const HERO_CATEGORIES = [
  { slug: "all", label: "All", icon: LayoutGrid },
  { slug: "cafes", label: "Cafés", icon: Coffee },
  { slug: "restaurants", label: "Restaurants", icon: Utensils },
  { slug: "hotels", label: "Hotels", icon: BedDouble },
  { slug: "salons", label: "Salons", icon: Scissors },
  { slug: "fitness", label: "Fitness", icon: Dumbbell },
  { slug: "shopping", label: "Shopping", icon: ShoppingBag },
  { slug: "more", label: "More", icon: Sparkles },
];

/* Intent-based presets derived strictly from available data */
const INTENT_PRESETS = [
  { label: "Coffee & Bakes", query: "coffee", icon: Coffee, categorySlug: "cafes" },
  { label: "Family Dining", query: "dining", icon: Utensils, categorySlug: "restaurants" },
  { label: "Weekend Stays", query: "hotel", icon: BedDouble, categorySlug: "hotels" },
  { label: "Hair & Styling", query: "salon", icon: Scissors, categorySlug: "salons" },
  { label: "Gym & Fitness", query: "fitness", icon: Dumbbell, categorySlug: "fitness" },
  { label: "Shopping Deals", query: "shopping", icon: ShoppingBag, categorySlug: "shopping" },
];

/* -------------------------------------------------------------------------- */
/*                               HELPER UTILS                                 */
/* -------------------------------------------------------------------------- */

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Compute match score for smart ranking */
function computeRelevance(p: PublicPartner, query: string, tokens: string[]): number {
  if (!query) return 0;
  let score = 0;

  const name = normalize(p.business_name);
  const cat = normalize(p.category?.name || "");
  const desc = normalize(p.description || "");
  const city = normalize(p.city || "");
  const addr = normalize(p.address || "");
  const offer = p.offers[0];
  const offerTitle = normalize(offer?.title || "");
  const offerDesc = normalize(offer?.description || "");

  // 1. Name exact / prefix match
  if (name === query) score += 120;
  else if (name.startsWith(query)) score += 80;
  else if (name.includes(query)) score += 50;

  // 2. Category match
  if (cat === query) score += 60;
  else if (cat.includes(query)) score += 40;

  // 3. Location match
  if (city.includes(query) || addr.includes(query)) score += 35;

  // 4. Offer match
  if (offerTitle.includes(query) || offerDesc.includes(query)) score += 25;

  // 5. Description match
  if (desc.includes(query)) score += 20;

  // 6. Token matching & Synonyms
  for (const token of tokens) {
    if (token.length < 2) continue;

    if (name.includes(token)) score += 25;
    if (cat.includes(token)) score += 20;
    if (offerTitle.includes(token)) score += 15;
    if (desc.includes(token)) score += 10;
    if (city.includes(token)) score += 12;

    // Check synonyms
    const syns = SEARCH_SYNONYMS[token] || [];
    for (const syn of syns) {
      if (cat.includes(syn)) score += 22;
      if (name.includes(syn)) score += 18;
      if (desc.includes(syn)) score += 10;
    }
  }

  // Bonus for featured / active offer
  if (score > 0) {
    if (p.featured) score += 5;
    if (p.offers.length > 0) score += 5;
  }

  return score;
}

/* -------------------------------------------------------------------------- */
/*                               MAIN COMPONENT                               */
/* -------------------------------------------------------------------------- */

function Partners() {
  const { data: partners } = useSuspenseQuery(partnersQuery);
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/partners/" });

  // Search input state with debouncing
  const [searchInput, setSearchInput] = useState(s.q || "");
  const [debouncedQuery, setDebouncedQuery] = useState(s.q || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(s.category);
  const [selectedCity, setSelectedCity] = useState<string | undefined>(s.city);
  const [discountMin, setDiscountMin] = useState<number>(s.discountMin || 0);
  const [minBillFilter, setMinBillFilter] = useState<string>(s.minBill || "any");
  const [offerTypeFilter, setOfferTypeFilter] = useState<string>(s.offerType || "all");
  const [featuredOnly, setFeaturedOnly] = useState<boolean>(Boolean(s.featured));
  const [withOfferOnly, setWithOfferOnly] = useState<boolean>(Boolean(s.withOffer));
  const [sortBy, setSortBy] = useState<string>(s.sort || "recommended");

  // Filter drawer modal
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Debounce search input to avoid lag
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
    }, 150);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Click outside to dismiss autocomplete
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update URL parameters when search / filters change
  const syncToUrl = (newParams: Partial<z.infer<typeof searchSchema>>) => {
    navigate({
      search: {
        ...s,
        ...newParams,
      },
    });
  };

  const cities = useMemo(
    () => [...new Set(partners.map((p) => p.city).filter(Boolean))] as string[],
    [partners]
  );

  // Dynamic Autocomplete suggestions derived strictly from available data
  const suggestions = useMemo(() => {
    if (!searchInput.trim() || searchInput.trim().length < 2) return [];
    const norm = normalize(searchInput);

    const matches: Array<{
      type: "business" | "category" | "intent";
      label: string;
      sublabel?: string;
      action: () => void;
    }> = [];

    // Matching Businesses (Max 4)
    partners.forEach((p) => {
      if (normalize(p.business_name).includes(norm)) {
        matches.push({
          type: "business",
          label: p.business_name,
          sublabel: p.category?.name || p.city || undefined,
          action: () => {
            setSearchInput(p.business_name);
            setShowSuggestions(false);
            syncToUrl({ q: p.business_name });
          },
        });
      }
    });

    // Matching Categories (Max 3)
    categories.forEach((c) => {
      if (normalize(c.name).includes(norm)) {
        const count = partners.filter((p) => p.category?.slug === c.slug).length;
        matches.push({
          type: "category",
          label: c.name,
          sublabel: `${count} businesses`,
          action: () => {
            setSelectedCategory(c.slug);
            setSearchInput("");
            setShowSuggestions(false);
            syncToUrl({ category: c.slug, q: undefined });
          },
        });
      }
    });

    return matches.slice(0, 6);
  }, [searchInput, partners, categories]);

  // Main Filtered & Relevance-ranked Results
  const filteredList = useMemo(() => {
    const normQuery = normalize(debouncedQuery);
    const tokens = normQuery.split(" ").filter(Boolean);

    let list = partners.filter((p) => {
      // 1. Category Filter
      if (selectedCategory && selectedCategory !== "all" && selectedCategory !== "more") {
        const catSlug = p.category?.slug?.toLowerCase() || "";
        const catName = p.category?.name?.toLowerCase() || "";
        const target = selectedCategory.toLowerCase();
        const matches =
          catSlug === target ||
          catSlug.includes(target) ||
          catName.includes(target) ||
          (target === "cafes" && (catName.includes("caf") || catName.includes("coffee"))) ||
          (target === "restaurants" && (catName.includes("rest") || catName.includes("din"))) ||
          (target === "hotels" && (catName.includes("hotel") || catName.includes("stay"))) ||
          (target === "salons" && (catName.includes("salon") || catName.includes("spa"))) ||
          (target === "fitness" && (catName.includes("fit") || catName.includes("gym"))) ||
          (target === "shopping" && (catName.includes("shop") || catName.includes("store")));

        if (!matches) return false;
      }

      // 2. City / Location Filter
      if (selectedCity && p.city !== selectedCity) return false;

      // 3. Featured Only
      if (featuredOnly && !p.featured) return false;

      // 4. Active Offers Only
      if (withOfferOnly && !p.offers.length) return false;

      // 5. Discount Range Filter
      const primaryOffer = p.offers[0];
      if (discountMin > 0) {
        if (!primaryOffer) return false;
        if (primaryOffer.discount_value < discountMin) return false;
      }

      // 6. Minimum Bill Filter
      if (minBillFilter !== "any") {
        if (!primaryOffer) return false;
        if (minBillFilter === "none" && primaryOffer.minimum_bill > 0) return false;
        if (minBillFilter === "500" && primaryOffer.minimum_bill > 500) return false;
        if (minBillFilter === "1000" && primaryOffer.minimum_bill > 1000) return false;
      }

      // 7. Offer Type Filter
      if (offerTypeFilter !== "all") {
        if (!primaryOffer) return false;
        if (offerTypeFilter === "percentage" && primaryOffer.discount_type !== "PERCENTAGE") return false;
        if (offerTypeFilter === "fixed" && primaryOffer.discount_type !== "FIXED") return false;
      }

      // 8. Smart Search Matching (Relevance check)
      if (normQuery) {
        const score = computeRelevance(p, normQuery, tokens);
        if (score <= 0) return false;
      }

      return true;
    });

    // Sorting & Relevance Ranking
    if (normQuery && sortBy === "recommended") {
      // Prioritize Query Relevance
      list = [...list].sort((a, b) => {
        const scoreA = computeRelevance(a, normQuery, tokens);
        const scoreB = computeRelevance(b, normQuery, tokens);
        return scoreB - scoreA;
      });
    } else if (sortBy === "discount") {
      list = [...list].sort((a, b) => {
        const valA = a.offers[0]?.discount_value || 0;
        const valB = b.offers[0]?.discount_value || 0;
        return valB - valA;
      });
    } else if (sortBy === "name") {
      list = [...list].sort((a, b) => a.business_name.localeCompare(b.business_name));
    } else {
      // Default Recommended: Featured first, then offers
      list = [...list].sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return (b.offers.length > 0 ? 1 : 0) - (a.offers.length > 0 ? 1 : 0);
      });
    }

    return list;
  }, [
    partners,
    debouncedQuery,
    selectedCategory,
    selectedCity,
    discountMin,
    minBillFilter,
    offerTypeFilter,
    featuredOnly,
    withOfferOnly,
    sortBy,
  ]);

  // Count active filters for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory && selectedCategory !== "all") count++;
    if (selectedCity) count++;
    if (discountMin > 0) count++;
    if (minBillFilter !== "any") count++;
    if (offerTypeFilter !== "all") count++;
    if (featuredOnly) count++;
    if (withOfferOnly) count++;
    return count;
  }, [selectedCategory, selectedCity, discountMin, minBillFilter, offerTypeFilter, featuredOnly, withOfferOnly]);

  const clearAllFilters = () => {
    setSearchInput("");
    setDebouncedQuery("");
    setSelectedCategory(undefined);
    setSelectedCity(undefined);
    setDiscountMin(0);
    setMinBillFilter("any");
    setOfferTypeFilter("all");
    setFeaturedOnly(false);
    setWithOfferOnly(false);
    setSortBy("recommended");
    navigate({ search: {} });
  };

  const handleHeroCategoryClick = (catSlug: string) => {
    if (catSlug === "all") {
      setSelectedCategory(undefined);
      syncToUrl({ category: undefined });
    } else {
      setSelectedCategory(catSlug);
      syncToUrl({ category: catSlug });
    }
  };

  const handleIntentClick = (intent: typeof INTENT_PRESETS[0]) => {
    setSearchInput(intent.query);
    setSelectedCategory(intent.categorySlug);
    syncToUrl({ q: intent.query, category: intent.categorySlug });
  };

  return (
    <SiteLayout>
      <div className="pb-24 lg:pb-16 bg-[#f8fafc]">
        {/* ================================================================== */}
        {/* 1. HERO BANNER & SMART SEARCH                                      */}
        {/* ================================================================== */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#090d16] via-[#0d1527] to-[#0b101d] text-white pt-10 pb-12 sm:pt-14 sm:pb-16 border-b border-slate-800">
          {/* Ambient Lighting & Glow */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-1/4 right-1/4 h-[380px] w-[500px] rounded-full bg-gradient-to-br from-amber-500/15 via-[#c25e36]/10 to-transparent blur-3xl" />
            <div className="absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
              {/* Left Column: Heading, Smart Search, Quick Categories */}
              <div className="lg:col-span-7 xl:col-span-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1 text-xs font-bold text-amber-300 backdrop-blur-sm mb-4">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <span>Currently Exclusive to Daltonganj (Palamu, Jharkhand)</span>
                </div>

                <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.08]">
                  Daltonganj.
                  <br />
                  Your Lifestyle.
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-[#e07548]">
                    Better Perks.
                  </span>
                </h1>

                <p className="mt-4 max-w-xl text-sm sm:text-base font-medium leading-relaxed text-slate-300">
                  Discover local restaurants, cafés, hotels, salons, fashion boutiques and lifestyle venues across Daltonganj. Unlock exclusive guaranteed benefits with your PennyGrade membership.
                </p>

                {/* Prominent Smart Search Input with Autocomplete */}
                <div ref={searchContainerRef} className="relative mt-6 max-w-2xl">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setShowSuggestions(false);
                      syncToUrl({ q: searchInput.trim() || undefined });
                    }}
                    role="search"
                    className="flex items-center overflow-hidden rounded-full border border-slate-700/80 bg-white p-1.5 shadow-2xl focus-within:ring-2 focus-within:ring-amber-400 transition-all"
                  >
                    <Search className="ml-3.5 h-4 w-4 text-slate-400 shrink-0" />
                    <input
                      type="search"
                      value={searchInput}
                      onChange={(e) => {
                        setSearchInput(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => {
                        if (suggestions.length > 0) setShowSuggestions(true);
                      }}
                      placeholder="Search by name, category, coffee, dining, stay..."
                      aria-label="Search businesses, categories, and offers"
                      aria-autocomplete="list"
                      className="flex-1 bg-transparent px-3 text-xs sm:text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                    />

                    {/* Clear Button */}
                    {searchInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchInput("");
                          setDebouncedQuery("");
                          syncToUrl({ q: undefined });
                        }}
                        aria-label="Clear search query"
                        className="p-1.5 mr-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}

                    <button
                      type="submit"
                      className="rounded-full bg-gradient-to-r from-[#c25e36] to-[#b85328] px-6 sm:px-8 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-[#c25e36]/30 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                    >
                      Search
                    </button>
                  </form>

                  {/* Autocomplete Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div
                      role="listbox"
                      className="absolute left-0 right-0 top-full mt-2 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl text-slate-900"
                    >
                      <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Suggested Results
                      </div>
                      <div className="divide-y divide-slate-100">
                        {suggestions.map((item, i) => (
                          <div
                            key={i}
                            role="option"
                            aria-selected={false}
                            tabIndex={0}
                            onClick={item.action}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") item.action();
                            }}
                            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-amber-50/80 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              {item.type === "business" ? (
                                <Store className="h-4 w-4 text-[#c25e36] shrink-0" />
                              ) : (
                                <Tag className="h-4 w-4 text-amber-500 shrink-0" />
                              )}
                              <span className="text-xs sm:text-sm font-bold text-slate-900">
                                {item.label}
                              </span>
                            </div>
                            {item.sublabel && (
                              <span className="text-[11px] font-medium text-slate-500">
                                {item.sublabel}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Intent-based Suggestions Bar */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400">Popular:</span>
                  {INTENT_PRESETS.map((intent) => {
                    const Icon = intent.icon;
                    return (
                      <button
                        key={intent.label}
                        type="button"
                        onClick={() => handleIntentClick(intent)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/90 px-3 py-1 text-xs font-semibold text-slate-300 hover:border-amber-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <Icon className="h-3.5 w-3.5 text-amber-400" />
                        <span>{intent.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Quick Category Icons Row */}
                <div className="mt-7 -mx-4 px-4 sm:mx-0 sm:px-0 flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                  {HERO_CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected =
                      (!selectedCategory && cat.slug === "all") ||
                      selectedCategory?.toLowerCase() === cat.slug;

                    return (
                      <button
                        key={cat.slug}
                        type="button"
                        onClick={() => handleHeroCategoryClick(cat.slug)}
                        className="group flex flex-col items-center gap-1.5 shrink-0 transition-transform active:scale-95 cursor-pointer"
                      >
                        <div
                          className={cn(
                            "flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl border transition-all shadow-sm",
                            isSelected
                              ? "bg-[#c25e36] border-[#e07548] text-white shadow-lg shadow-[#c25e36]/30"
                              : "bg-slate-900/90 border-slate-800 text-slate-300 hover:border-amber-400/50 hover:bg-slate-800 hover:text-white"
                          )}
                        >
                          <Icon className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:scale-110" />
                        </div>
                        <span
                          className={cn(
                            "text-[11px] sm:text-xs font-semibold tracking-tight transition-colors",
                            isSelected ? "text-amber-300 font-bold" : "text-slate-400 group-hover:text-slate-200"
                          )}
                        >
                          {cat.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: 3D Floating PennyGrade Card */}
              <div className="lg:col-span-5 xl:col-span-4 flex justify-center">
                <div className="relative group max-w-[340px] sm:max-w-[380px] w-full">
                  <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-amber-500/30 via-[#c25e36]/20 to-amber-400/30 blur-xl opacity-75 group-hover:opacity-100 transition-opacity" />
                  <div className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-slate-950 p-2 shadow-2xl ring-1 ring-white/10 transition-transform duration-500 group-hover:scale-[1.02]">
                    <img
                      src={CARD_URL}
                      alt="PennyGrade Premium Membership Card"
                      className="h-auto w-full rounded-xl object-cover shadow-inner"
                    />
                    <div className="absolute bottom-4 left-4 rounded-md bg-slate-950/85 px-2.5 py-1 font-mono text-[10px] font-black tracking-widest text-amber-200 border border-amber-400/40 backdrop-blur-xs">
                      PEN-7X4P-92LM
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* 2. STATS / HIGHLIGHTS STRIP                                        */}
        {/* ================================================================== */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-6 relative z-20">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-lg shadow-slate-200/60">
            <div className="flex items-center gap-3 p-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-[#c25e36] border border-amber-200/60">
                <Store className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <strong className="block font-display text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                  120+
                </strong>
                <span className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate block">
                  Partner Businesses
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2 border-l border-slate-100">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-[#c25e36] border border-amber-200/60">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <strong className="block font-display text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                  Daltonganj
                </strong>
                <span className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate block">
                  Local Discovery
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2 border-l border-slate-100">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-[#c25e36] border border-amber-200/60">
                <Gift className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <strong className="block font-display text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                  Up to 50%
                </strong>
                <span className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate block">
                  Exclusive Offers
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2 border-l border-slate-100">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-[#c25e36] border border-amber-200/60">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <strong className="block font-display text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                  One Membership
                </strong>
                <span className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate block">
                  Multiple Experiences
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* 3. DIRECTORY HEADER, FILTERS & CONTROLS                            */}
        {/* ================================================================== */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-12 sm:mt-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Partner Businesses
              </h2>
              <p className="mt-1 text-xs sm:text-sm font-medium text-slate-600">
                Showing {filteredList.length} verified businesses in Daltonganj (Palamu, Jharkhand)
              </p>
            </div>

            {/* Filter Drawer Trigger & Sort Dropdown */}
            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              {/* All Filters Button */}
              <button
                type="button"
                onClick={() => setFilterSheetOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-2xs hover:border-amber-400 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#c25e36] text-[10px] font-black text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Sorting Dropdown */}
              <div className="relative inline-flex items-center">
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    syncToUrl({ sort: e.target.value });
                  }}
                  className="appearance-none rounded-xl border border-slate-200 bg-white pl-3.5 pr-8 py-2 text-xs font-bold text-slate-800 shadow-2xs hover:border-amber-400 focus:outline-none cursor-pointer"
                >
                  <option value="recommended">Recommended</option>
                  <option value="discount">Highest Discount</option>
                  <option value="name">A–Z (Alphabetical)</option>
                </select>
                <ChevronDown className="absolute right-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Horizontal Quick Filter Pills Row */}
          <div className="-mx-4 sm:mx-0 mt-6 flex items-center gap-2 overflow-x-auto px-4 sm:px-0 pb-2 scrollbar-none">
            {/* All */}
            <button
              type="button"
              onClick={() => handleHeroCategoryClick("all")}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-all shadow-2xs cursor-pointer",
                !selectedCategory || selectedCategory === "all"
                  ? "bg-[#c25e36] text-white shadow-md shadow-[#c25e36]/25"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-amber-400 hover:text-slate-900"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>All</span>
            </button>

            {/* Dynamic Categories */}
            {categories.map((c) => {
              const isSelected = selectedCategory === c.slug;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleHeroCategoryClick(c.slug)}
                  className={cn(
                    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-all shadow-2xs cursor-pointer",
                    isSelected
                      ? "bg-[#c25e36] text-white shadow-md shadow-[#c25e36]/25"
                      : "border border-slate-200 bg-white text-slate-700 hover:border-amber-400 hover:text-slate-900"
                  )}
                >
                  <span>{c.name}</span>
                </button>
              );
            })}

            <span className="mx-1 h-5 w-px shrink-0 bg-slate-300" />

            {/* Featured Only */}
            <button
              type="button"
              onClick={() => {
                const next = !featuredOnly;
                setFeaturedOnly(next);
                syncToUrl({ featured: next ? true : undefined });
              }}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-all shadow-2xs cursor-pointer",
                featuredOnly
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-amber-400"
              )}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Featured Only</span>
            </button>

            {/* Active Offers Only */}
            <button
              type="button"
              onClick={() => {
                const next = !withOfferOnly;
                setWithOfferOnly(next);
                syncToUrl({ withOffer: next ? true : undefined });
              }}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-all shadow-2xs cursor-pointer",
                withOfferOnly
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-amber-400"
              )}
            >
              <Gift className="h-3.5 w-3.5 text-amber-500" />
              <span>Active Offers</span>
            </button>
          </div>

          {/* Active Filter Badges Bar */}
          {(activeFilterCount > 0 || debouncedQuery) && (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 mr-1">Active filters:</span>

              {debouncedQuery && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">
                  <span>Search: "{debouncedQuery}"</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setDebouncedQuery("");
                      syncToUrl({ q: undefined });
                    }}
                    className="hover:text-red-500 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {selectedCategory && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">
                  <span>Category: {selectedCategory}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory(undefined);
                      syncToUrl({ category: undefined });
                    }}
                    className="hover:text-red-500 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {selectedCity && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">
                  <span>City: {selectedCity}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCity(undefined)}
                    className="hover:text-red-500 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {discountMin > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">
                  <span>Min: {discountMin}% OFF</span>
                  <button
                    type="button"
                    onClick={() => setDiscountMin(0)}
                    className="hover:text-red-500 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {minBillFilter !== "any" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">
                  <span>
                    Bill: {minBillFilter === "none" ? "No Min Bill" : `Under ₹${minBillFilter}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMinBillFilter("any")}
                    className="hover:text-red-500 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {offerTypeFilter !== "all" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">
                  <span>Type: {offerTypeFilter === "percentage" ? "Percentage (%)" : "Flat (₹)"}</span>
                  <button
                    type="button"
                    onClick={() => setOfferTypeFilter("all")}
                    className="hover:text-red-500 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {featuredOnly && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">
                  <span>Featured Only</span>
                  <button
                    type="button"
                    onClick={() => setFeaturedOnly(false)}
                    className="hover:text-red-500 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {/* Reset All */}
              <button
                type="button"
                onClick={clearAllFilters}
                className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-[#c25e36] hover:underline cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset All</span>
              </button>
            </div>
          )}

          {/* ================================================================ */}
          {/* 4. RESULTS GRID OR EMPTY STATE                                   */}
          {/* ================================================================ */}
          <div className="mt-8">
            {filteredList.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 text-center shadow-xs">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-[#c25e36]">
                  <Search className="h-7 w-7" />
                </div>
                <h3 className="mt-4 font-display text-xl font-bold text-slate-900">
                  No matching partner businesses found
                </h3>
                <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-slate-600 leading-relaxed">
                  We couldn't find any businesses matching{" "}
                  {debouncedQuery ? `"${debouncedQuery}"` : "your criteria"} with the selected filters.
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#c25e36] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-[#c25e36]/30 hover:bg-[#a84d28] transition-all cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Clear All Filters</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("coffee");
                      setSelectedCategory("cafes");
                      syncToUrl({ q: "coffee", category: "cafes" });
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:border-amber-400 transition-colors cursor-pointer"
                  >
                    <Coffee className="h-4 w-4 text-amber-600" />
                    <span>Browse Cafés</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("dining");
                      setSelectedCategory("restaurants");
                      syncToUrl({ q: "dining", category: "restaurants" });
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:border-amber-400 transition-colors cursor-pointer"
                  >
                    <Utensils className="h-4 w-4 text-amber-600" />
                    <span>Browse Dining</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredList.map((p) => (
                  <PartnerCard key={p.id} p={p} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ================================================================== */}
        {/* 5. FILTER BOTTOM SHEET / SIDE DRAWER                               */}
        {/* ================================================================== */}
        <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
          <SheetContent side="bottom" className="sm:max-w-lg sm:rounded-t-3xl max-h-[85vh] overflow-y-auto p-6">
            <SheetHeader className="text-left pb-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <SheetTitle className="font-display text-lg font-bold text-slate-900">
                  Filter Businesses
                </SheetTitle>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs font-bold text-[#c25e36] hover:underline"
                >
                  Reset All
                </button>
              </div>
              <SheetDescription className="text-xs text-slate-500">
                Refine by category, discount rate, minimum bill, or location
              </SheetDescription>
            </SheetHeader>

            <div className="py-5 space-y-6">
              {/* Category */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2.5">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(undefined)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                      !selectedCategory
                        ? "bg-[#c25e36] text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:border-amber-400"
                    )}
                  >
                    All Categories
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCategory(c.slug)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                        selectedCategory === c.slug
                          ? "bg-[#c25e36] text-white"
                          : "border border-slate-200 bg-white text-slate-700 hover:border-amber-400"
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location / City */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
                  Location / City
                </label>
                <select
                  value={selectedCity || ""}
                  onChange={(e) => setSelectedCity(e.target.value || undefined)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-400"
                >
                  <option value="">All Locations (Daltonganj)</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Discount Range */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2.5">
                  Minimum Discount
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Any", val: 0 },
                    { label: "10%+", val: 10 },
                    { label: "15%+", val: 15 },
                    { label: "20%+", val: 20 },
                  ].map((d) => (
                    <button
                      key={d.val}
                      type="button"
                      onClick={() => setDiscountMin(d.val)}
                      className={cn(
                        "rounded-lg py-2 text-xs font-bold transition-all cursor-pointer",
                        discountMin === d.val
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 bg-white text-slate-700 hover:border-amber-400"
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Minimum Bill Amount */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2.5">
                  Minimum Bill
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Any Bill", val: "any" },
                    { label: "No Min Bill", val: "none" },
                    { label: "Under ₹500", val: "500" },
                  ].map((b) => (
                    <button
                      key={b.val}
                      type="button"
                      onClick={() => setMinBillFilter(b.val)}
                      className={cn(
                        "rounded-lg py-2 text-xs font-bold transition-all cursor-pointer",
                        minBillFilter === b.val
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 bg-white text-slate-700 hover:border-amber-400"
                      )}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Offer Type */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2.5">
                  Offer Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "All Types", val: "all" },
                    { label: "Percentage (%)", val: "percentage" },
                    { label: "Flat Off (₹)", val: "fixed" },
                  ].map((t) => (
                    <button
                      key={t.val}
                      type="button"
                      onClick={() => setOfferTypeFilter(t.val)}
                      className={cn(
                        "rounded-lg py-2 text-xs font-bold transition-all cursor-pointer",
                        offerTypeFilter === t.val
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 bg-white text-slate-700 hover:border-amber-400"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featuredOnly}
                    onChange={(e) => setFeaturedOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#c25e36] focus:ring-amber-400"
                  />
                  <span className="text-xs font-bold text-slate-800">Featured Businesses Only</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={withOfferOnly}
                    onChange={(e) => setWithOfferOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#c25e36] focus:ring-amber-400"
                  />
                  <span className="text-xs font-bold text-slate-800">Only With Active Member Offers</span>
                </label>
              </div>
            </div>

            <SheetFooter className="pt-4 border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={() => setFilterSheetOpen(false)}
                className="w-full rounded-xl bg-[#c25e36] py-3 text-xs font-bold text-white shadow-md hover:bg-[#a84d28] transition-colors"
              >
                Show {filteredList.length} Businesses
              </button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* ================================================================== */}
        {/* 6. MOBILE FIXED BOTTOM NAVIGATION BAR                              */}
        {/* ================================================================== */}
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-slate-200 bg-white/95 backdrop-blur-md shadow-lg">
          <div className="grid grid-cols-4 h-16 items-center px-2 text-center">
            <Link
              to="/"
              className="flex flex-col items-center justify-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <Home className="h-5 w-5" />
              <span>Home</span>
            </Link>

            <Link
              to="/partners"
              className="flex flex-col items-center justify-center gap-1 text-[10px] font-black text-[#c25e36] transition-colors relative"
            >
              <LayoutGrid className="h-5 w-5" />
              <span>Businesses</span>
              <span className="absolute -bottom-1 h-0.5 w-8 rounded-full bg-[#c25e36]" />
            </Link>

            <Link
              to="/how-it-works"
              className="flex flex-col items-center justify-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <CreditCard className="h-5 w-5" />
              <span>Membership</span>
            </Link>

            <Link
              to="/history"
              className="flex flex-col items-center justify-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <User className="h-5 w-5" />
              <span>Profile</span>
            </Link>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
