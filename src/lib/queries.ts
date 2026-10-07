import { queryOptions } from "@tanstack/react-query";
import { getCategories, getPartners, getPartner } from "@/lib/public.functions";
import {
  Coffee, UtensilsCrossed, BedDouble, Scissors, Dumbbell, ShoppingBag, Clapperboard, Plane, Car, HeartPulse, GraduationCap, Sparkles,
  type LucideIcon,
} from "lucide-react";

export const categoriesQuery = queryOptions({ queryKey: ["public", "categories"], queryFn: () => getCategories(), staleTime: 60_000 });
export const partnersQuery = queryOptions({ queryKey: ["public", "partners"], queryFn: () => getPartners(), staleTime: 60_000 });
export const partnerQuery = (slug: string) =>
  queryOptions({ queryKey: ["public", "partner", slug], queryFn: () => getPartner({ data: { slug } }), staleTime: 30_000 });

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Coffee, UtensilsCrossed, BedDouble, Scissors, Dumbbell, ShoppingBag, Clapperboard, Plane, Car, HeartPulse, GraduationCap, Sparkles,
};
export const categoryIcon = (name?: string | null) => (name && CATEGORY_ICONS[name]) || Sparkles;
