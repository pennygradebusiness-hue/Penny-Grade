import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { getSiteUrl } from "@/lib/seo";
import {
  MoreHorizontal,
  Star,
  Trash2,
  Building2,
  Globe,
  MapPin,
  Sparkles,
  Loader2,
} from "lucide-react";
import { PageHeader, DataTable, td, TableSkeleton, Select } from "@/components/admin-ui";
import { StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { slugify, fmtDate } from "@/lib/format";
import {
  getAdminPartners,
  savePartner,
  updatePartnerStatus,
  deletePartner,
  getPartnerApplications,
  updatePartnerApplicationStatus,
  saveOffer,
  getAdminOffers,
} from "@/lib/admin.functions";
import type { V1PartnerApplication, V1Partner } from "@/lib/v1-store";

export const Route = createFileRoute("/_authenticated/admin/partners")({ component: Partners });

const DEFAULT_CATEGORIES = [
  { id: "e7d3fd02-abd7-4ba4-b129-294ac76bff15", name: "Cafés", slug: "cafes" },
  { id: "1034422b-089a-4797-bf64-2578eb78adb9", name: "Restaurants", slug: "restaurants" },
  { id: "11ca8085-0ae1-46cb-85eb-bab56680b39f", name: "Hotels", slug: "hotels" },
  { id: "ade29f0c-e3f0-4609-bfdd-6ef41614ced6", name: "Salons", slug: "salons" },
  { id: "d8b33df5-ccbc-45c1-a4ea-dce08d1ca9b0", name: "Fitness", slug: "fitness" },
  { id: "cat-retail-001", name: "Retail & Shopping", slug: "retail" },
  { id: "cat-health-001", name: "Healthcare & Diagnostics", slug: "healthcare" },
];

const EMPTY = {
  business_name: "",
  slug: "",
  category_id: "e7d3fd02-abd7-4ba4-b129-294ac76bff15",
  description: "",
  logo_url: "",
  cover_image_url: "",
  phone: "",
  email: "",
  website: "",
  address: "",
  city: "Daltonganj",
  latitude: "",
  longitude: "",
  business_hours: "Mon–Sun · 9:00 AM – 10:00 PM",
  status: "ACTIVE",
  featured: false,
  create_offer: false,
  offer_title: "",
  offer_discount_type: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
  offer_discount_value: 10,
  offer_min_bill: 0,
};
type Form = typeof EMPTY & { id?: string };

function Partners() {
  const qc = useQueryClient();
  const fetchPartnersFn = useServerFn(getAdminPartners);
  const savePartnerFn = useServerFn(savePartner);
  const updatePartnerStatusFn = useServerFn(updatePartnerStatus);
  const deletePartnerFn = useServerFn(deletePartner);
  const fetchPartnerAppsFn = useServerFn(getPartnerApplications);
  const updatePartnerAppFn = useServerFn(updatePartnerApplicationStatus);
  const saveOfferFn = useServerFn(saveOffer);
  const getAdminOffersFn = useServerFn(getAdminOffers);

  const [tab, setTab] = useState<"partners" | "inquiries">("partners");
  const q = useQuery({
    queryKey: ["admin", "partners"],
    queryFn: async () => {
      try {
        const res = await fetchPartnersFn();
        if (Array.isArray(res)) return res as V1Partner[];
      } catch (err) {
        console.warn("fetchPartnersFn failed, falling back to Supabase query:", err);
      }
      try {
        const { data: dbData } = await supabase
          .from("partners")
          .select("*, category:categories(id, name, slug)")
          .order("business_name");
        if (dbData && dbData.length > 0) {
          return dbData.map((p: any) => ({
            ...p,
            category_name: p.category?.name || "General",
          })) as V1Partner[];
        }
      } catch (sbErr) {
        console.error("Direct Supabase query failed:", sbErr);
      }
      return [] as V1Partner[];
    },
  });

  const cats = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      try {
        const { data } = await supabase.from("categories").select("*").order("sort_order");
        if (data && data.length > 0) return data;
      } catch {
        // ignore
      }
      return DEFAULT_CATEGORIES;
    },
  });

  const partnerAppsQ = useQuery({
    queryKey: ["admin", "partner-applications"],
    queryFn: async () => (await fetchPartnerAppsFn()) as V1PartnerApplication[],
  });

  const offersQ = useQuery({
    queryKey: ["admin", "offers"],
    queryFn: async () => {
      try {
        const res = await getAdminOffersFn();
        if (res) return res;
      } catch {}
      return [];
    },
  });

  const [edit, setEdit] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [manualSlug, setManualSlug] = useState(false);
  const [search, setSearch] = useState("");
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin"] });
    qc.invalidateQueries({ queryKey: ["public"] });
  };

  const validate = (): boolean => {
    if (!edit) return false;
    const errs: Record<string, string> = {};

    if (!edit.business_name.trim() || edit.business_name.trim().length < 2) {
      errs.business_name = "Business name must be at least 2 characters.";
    }

    const cleanSlug = edit.slug.trim().toLowerCase();
    if (!cleanSlug) {
      errs.slug = "Slug is required.";
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanSlug)) {
      errs.slug = "Slug must contain only lowercase letters, numbers, and hyphens.";
    }

    if (!edit.category_id) {
      errs.category_id = "Please select a category.";
    }

    if (edit.email && edit.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(edit.email.trim())) {
      errs.email = "Please enter a valid email address.";
    }

    if (edit.website && edit.website.trim() && !/^https?:\/\//i.test(edit.website.trim())) {
      errs.website = "Website URL must start with http:// or https://";
    }

    if (edit.logo_url && edit.logo_url.trim() && !/^https?:\/\//i.test(edit.logo_url.trim())) {
      errs.logo_url = "Logo URL must start with http:// or https://";
    }

    if (edit.cover_image_url && edit.cover_image_url.trim() && !/^https?:\/\//i.test(edit.cover_image_url.trim())) {
      errs.cover_image_url = "Cover image URL must start with http:// or https://";
    }

    if (edit.latitude !== "" && edit.latitude !== null && edit.latitude !== undefined) {
      const lat = Number(edit.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        errs.latitude = "Latitude must be between -90 and 90.";
      }
    }

    if (edit.longitude !== "" && edit.longitude !== null && edit.longitude !== undefined) {
      const lng = Number(edit.longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        errs.longitude = "Longitude must be between -180 and 180.";
      }
    }

    if (!edit.id && edit.create_offer) {
      if (!edit.offer_title?.trim()) {
        errs.offer_title = "Offer title is required.";
      }
      const val = Number(edit.offer_discount_value);
      if (isNaN(val) || val <= 0) {
        errs.offer_discount_value = "Discount value must be greater than 0.";
      } else if (edit.offer_discount_type === "PERCENTAGE" && val > 100) {
        errs.offer_discount_value = "Percentage discount cannot exceed 100%.";
      }
      const minBill = Number(edit.offer_min_bill);
      if (isNaN(minBill) || minBill < 0) {
        errs.offer_min_bill = "Minimum bill cannot be negative.";
      }
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error("Please correct the errors in the form before saving.");
      return false;
    }
    return true;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!edit) return;
    if (!edit.id && !manualSlug) {
      setEdit({
        ...edit,
        business_name: val,
        slug: slugify(val),
      });
    } else {
      setEdit({
        ...edit,
        business_name: val,
      });
    }
    if (errors.business_name) {
      setErrors((prev) => ({ ...prev, business_name: "" }));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!edit) return;
    setManualSlug(true);
    setEdit({
      ...edit,
      slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
    });
    if (errors.slug) {
      setErrors((prev) => ({ ...prev, slug: "" }));
    }
  };

  const setField = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!edit) return;
    setEdit({ ...edit, [k]: e.target.value });
    if (errors[k]) {
      setErrors((prev) => ({ ...prev, [k]: "" }));
    }
  };

  const upd = async (id: string, patch: { status?: "ACTIVE" | "INACTIVE" | "SUSPENDED"; featured?: boolean }, action: string) => {
    try {
      await updatePartnerStatusFn({ data: { id, ...patch } });
      try {
        await supabase.from("partners").update(patch as any).eq("id", id);
      } catch {
        // ignore
      }
      toast.success(action);
      refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update partner");
    }
  };

  const save = async () => {
    if (!edit) return;
    if (!validate()) return;

    setSaving(true);
    const { id, ...f } = edit;
    const num = (v: string | number | null | undefined) => (v === "" || v === null || v === undefined ? null : Number(v));
    const allCats = cats.data && cats.data.length > 0 ? cats.data : DEFAULT_CATEGORIES;
    const matchedCat = allCats.find((c) => c.id === f.category_id);

    try {
      const partnerRes = await savePartnerFn({
        data: {
          id: id || undefined,
          business_name: f.business_name.trim(),
          slug: f.slug.trim().toLowerCase(),
          category_id: f.category_id,
          category_name: matchedCat?.name || "General",
          description: f.description?.trim() || "",
          logo_url: f.logo_url?.trim() || "",
          cover_image_url: f.cover_image_url?.trim() || "",
          phone: f.phone?.trim() || "",
          email: f.email?.trim() || "",
          website: f.website?.trim() || "",
          address: f.address?.trim() || "",
          city: f.city?.trim() || "Daltonganj",
          latitude: num(f.latitude),
          longitude: num(f.longitude),
          business_hours: f.business_hours?.trim() || "",
          status: (f.status || "ACTIVE") as "ACTIVE" | "INACTIVE" | "SUSPENDED",
          featured: Boolean(f.featured),
        },
      });

      const newPartnerId = id || (partnerRes as any)?.partner?.id;

      if (!id && f.create_offer && newPartnerId) {
        try {
          await saveOfferFn({
            data: {
              partner_id: newPartnerId,
              title: f.offer_title?.trim() || `${f.business_name.trim()} Member Discount`,
              discount_type: f.offer_discount_type || "PERCENTAGE",
              discount_value: Number(f.offer_discount_value) || 10,
              minimum_bill: Number(f.offer_min_bill) || 0,
              valid_days: [0, 1, 2, 3, 4, 5, 6],
              status: "ACTIVE",
            },
          });
        } catch (offerErr: any) {
          console.warn("Could not auto-create initial offer:", offerErr);
        }
      }

      try {
        const sbPayload: any = {
          business_name: f.business_name.trim(),
          slug: f.slug.trim().toLowerCase(),
          category_id: f.category_id,
          description: f.description?.trim() || "",
          logo_url: f.logo_url?.trim() || null,
          cover_image_url: f.cover_image_url?.trim() || null,
          phone: f.phone?.trim() || null,
          email: f.email?.trim() || null,
          website: f.website?.trim() || null,
          address: f.address?.trim() || null,
          city: f.city?.trim() || "Daltonganj",
          latitude: num(f.latitude),
          longitude: num(f.longitude),
          business_hours: f.business_hours?.trim() || null,
          status: (f.status || "ACTIVE") as any,
          featured: Boolean(f.featured),
        };
        if (id) {
          await supabase.from("partners").update(sbPayload).eq("id", id);
        } else {
          await supabase.from("partners").insert(sbPayload);
        }
      } catch {
        // ignore
      }

      toast.success(
        id
          ? "Partner updated successfully"
          : f.create_offer
          ? "Partner & initial offer created successfully!"
          : "Partner created successfully"
      );
      setEdit(null);
      setErrors({});
      refresh();
    } catch (err: any) {
      toast.error(err?.message || "Could not save partner");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${name}" and all of its associated offers? This action cannot be undone.`)) return;
    try {
      await deletePartnerFn({ data: { id } });
      try {
        await supabase.from("verification_logs").delete().eq("partner_id", id);
        await supabase.from("verification_sessions").delete().eq("partner_id", id);
        await supabase.from("offers").delete().eq("partner_id", id);
        await supabase.from("partners").delete().eq("id", id);
      } catch {
        // ignore
      }
      toast.success(`Partner "${name}" and related offers permanently deleted`);
      qc.invalidateQueries({ queryKey: ["admin", "partners"] });
      qc.invalidateQueries({ queryKey: ["admin", "offers"] });
      qc.invalidateQueries({ queryKey: ["admin", "qr"] });
      qc.invalidateQueries({ queryKey: ["admin", "partners-min"] });
      qc.invalidateQueries({ queryKey: ["public", "partners"] });
      refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete partner");
    }
  };

  const list = (q.data ?? []).filter((p) => !search || p.business_name.toLowerCase().includes(search.toLowerCase()));
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setEdit({ ...edit!, [k]: e.target.value });
  const handleUpdateInquiry = async (id: string, st: "PENDING_REVIEW" | "CONTACTED" | "ONBOARDED" | "REJECTED") => {
    try {
      await updatePartnerAppFn({ data: { id, status: st } });
      toast.success(`Inquiry marked as ${st.replace(/_/g, " ")}`);
      refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
    }
  };

  const pendingInquiriesCount = (partnerAppsQ.data ?? []).filter((a) => a.status === "PENDING_REVIEW").length;

  return (
    <>
      <PageHeader
        title="Partners & Inquiries"
        desc={`${q.data?.length ?? 0} active partners · ${partnerAppsQ.data?.length ?? 0} onboarding inquiries`}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setManualSlug(false);
              setErrors({});
              setEdit({ ...EMPTY });
            }}
            className="bg-gold font-bold text-accent-foreground hover:bg-gold-soft cursor-pointer"
          >
            Add partner
          </Button>
        }
      />

      {/* Tabs */}
      <div className="mb-5 flex items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setTab("partners")}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
            tab === "partners"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Active Partners ({list.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("inquiries")}
          className={`relative rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
            tab === "inquiries"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Partner Inquiries & Applications ({partnerAppsQ.data?.length ?? 0})
          {pendingInquiriesCount > 0 && (
            <span className="ml-1.5 inline-flex items-center rounded-full bg-red-500 px-1.5 py-0.2 text-[10px] font-extrabold text-white">
              {pendingInquiriesCount} new
            </span>
          )}
        </button>
      </div>

      {tab === "inquiries" ? (
        /* Partner Inquiries Table */
        <div>
          <div className="mb-4 text-xs text-muted-foreground">
            Inquiries received from the public <strong className="text-foreground">"Partner With Us"</strong> page. Contact prospective outlets to arrange standee delivery and offer setup.
          </div>

          {partnerAppsQ.isLoading ? (
            <TableSkeleton />
          ) : (
            <DataTable
              head={["Ref No.", "Business Name", "Category", "Contact Person & Phone", "Location", "Proposed Offer", "Status", "Actions"]}
              empty={!(partnerAppsQ.data?.length)}
            >
              {(partnerAppsQ.data ?? []).map((app) => (
                <tr key={app.id} className="hover:bg-muted/40">
                  <td className={`${td} font-mono text-xs font-semibold`}>
                    {app.application_number}
                    <div className="text-[10px] text-muted-foreground font-normal">
                      {fmtDate(app.created_at)}
                    </div>
                  </td>
                  <td className={`${td} font-medium`}>
                    <p className="font-bold text-foreground">{app.business_name}</p>
                    <p className="text-xs text-muted-foreground">{app.email}</p>
                    {app.notes && (
                      <p className="mt-1 text-[11px] text-amber-800 bg-amber-50 rounded px-1.5 py-0.5 inline-block">
                        Note: {app.notes}
                      </p>
                    )}
                  </td>
                  <td className={td}>
                    <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                      {app.category_name}
                    </span>
                  </td>
                  <td className={td}>
                    <p className="font-semibold text-xs">{app.contact_name}</p>
                    <a
                      href={`tel:+91${app.mobile}`}
                      className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                    >
                      +91 {app.mobile}
                    </a>
                  </td>
                  <td className={td}>
                    <p className="font-semibold text-xs">{app.city}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{app.address}</p>
                  </td>
                  <td className={td}>
                    <span className="font-semibold text-xs text-amber-900 bg-amber-50 border border-amber-200/60 rounded px-2 py-0.5 inline-block">
                      {app.proposed_discount}
                    </span>
                    {app.minimum_bill && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">Min Bill: {app.minimum_bill}</p>
                    )}
                  </td>
                  <td className={td}>
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        app.status === "ONBOARDED"
                          ? "bg-emerald-100 text-emerald-800"
                          : app.status === "CONTACTED"
                          ? "bg-blue-100 text-blue-800"
                          : app.status === "REJECTED"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {app.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className={td}>
                    <div className="flex items-center gap-1.5">
                      {app.status === "PENDING_REVIEW" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleUpdateInquiry(app.id, "CONTACTED")}
                          >
                            Mark Contacted
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 bg-gold font-bold text-accent-foreground hover:bg-gold-soft text-xs"
                            onClick={() => handleUpdateInquiry(app.id, "ONBOARDED")}
                          >
                            Onboard
                          </Button>
                        </>
                      )}
                      {app.status === "CONTACTED" && (
                        <Button
                          size="sm"
                          className="h-7 bg-gold font-bold text-accent-foreground hover:bg-gold-soft text-xs"
                          onClick={() => handleUpdateInquiry(app.id, "ONBOARDED")}
                        >
                          Mark Onboarded
                        </Button>
                      )}
                      {app.status === "ONBOARDED" && (
                        <span className="text-xs text-emerald-600 font-semibold">
                          ✓ Onboarded
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </div>
      ) : (
        /* Active Partners List */
        <div>
          <Input placeholder="Search partners" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 h-9 max-w-xs bg-card" />
          {q.isLoading ? <TableSkeleton /> : (
            <DataTable head={["Partner", "Category", "City", "Offers", "Status", "Featured", ""]} empty={!list.length}>
              {list.map((p) => {
                const catName = p.category_name || (p as any).category?.name || "General";
                const pOffers = (offersQ.data ?? []).filter((o: any) => o.partner_id === p.id);
                return (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className={td}><p className="font-bold text-navy">{p.business_name}</p><p className="text-xs text-muted-foreground font-mono">/{p.slug}</p></td>
                    <td className={td}><span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{catName}</span></td>
                    <td className={td}>{p.city || "Daltonganj"}</td>
                    <td className={td}>
                      {pOffers.length > 0 ? (
                        <Link
                          to="/admin/offers"
                          search={{ partner: p.id }}
                          className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                        >
                          {pOffers.length} {pOffers.length === 1 ? "Offer" : "Offers"}
                        </Link>
                      ) : (
                        <Link
                          to="/admin/offers"
                          search={{ partner: p.id, create: "true" }}
                          className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900 border border-amber-300 hover:bg-amber-200 transition-colors shadow-2xs"
                        >
                          + Add offer
                        </Link>
                      )}
                    </td>
                    <td className={td}><StatusBadge status={p.status} /></td>
                    <td className={td}>{p.featured && <Star className="h-4 w-4 fill-gold text-gold" />}</td>
                    <td className={td}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="cursor-pointer"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => {
                              setManualSlug(true);
                              setErrors({});
                              setEdit({
                                ...EMPTY,
                                ...p,
                                latitude: String(p.latitude ?? ""),
                                longitude: String(p.longitude ?? ""),
                                create_offer: false,
                              } as Form);
                            }}
                          >
                            Edit details
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="cursor-pointer">
                            <Link to="/admin/offers" search={{ partner: p.id, create: "true" }}>
                              + Create offer
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer" onClick={() => upd(p.id, { featured: !p.featured }, p.featured ? "Unfeatured partner" : "Featured partner")}>
                            {p.featured ? "Unfeature" : "Feature"}
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="cursor-pointer">
                            <Link to="/admin/qr-codes">QR code</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {p.status !== "ACTIVE" && (
                            <DropdownMenuItem className="cursor-pointer font-medium text-emerald-700" onClick={() => upd(p.id, { status: "ACTIVE" }, "Activated partner")}>
                              Activate
                            </DropdownMenuItem>
                          )}
                          {p.status === "ACTIVE" && (
                            <DropdownMenuItem className="cursor-pointer font-medium text-slate-700" onClick={() => upd(p.id, { status: "INACTIVE" }, "Deactivated partner")}>
                              Deactivate
                            </DropdownMenuItem>
                          )}
                          {p.status !== "SUSPENDED" && (
                            <DropdownMenuItem className="cursor-pointer text-amber-700" onClick={() => upd(p.id, { status: "SUSPENDED" }, "Suspended partner")}>
                              Suspend
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive font-semibold cursor-pointer hover:bg-destructive/10"
                            onClick={() => handleDelete(p.id, p.business_name)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete partner
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </DataTable>
          )}
        </div>
      )}
      <Dialog open={!!edit} onOpenChange={(o) => { if (!o && !saving) { setEdit(null); setErrors({}); } }}>
        <DialogContent className="max-h-[88vh] max-w-2xl sm:max-w-3xl flex flex-col p-0 overflow-hidden rounded-2xl border-slate-200 shadow-2xl bg-white">
          {/* Sticky Header */}
          <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-white shrink-0 text-left">
            <DialogTitle className="font-display text-lg font-bold text-slate-900">
              {edit?.id ? "Edit Partner Details" : "Add New Partner"}
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              {edit?.id
                ? "Update outlet identity, location coordinates, and counter verification settings."
                : "Register a local business outlet with public catalog listing and verification QR."}
            </p>
          </DialogHeader>

          {/* Scrollable Form Body */}
          {edit && (
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">
              {/* SECTION A: Basic Details */}
              <div>
                <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-slate-100">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-800">
                    <Building2 className="h-3.5 w-3.5" />
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    A. Basic Details
                  </h4>
                </div>
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <FormField label="Business Name" required error={errors.business_name}>
                    <Input
                      value={edit.business_name}
                      onChange={handleNameChange}
                      placeholder="e.g. Urban Brew Café"
                    />
                  </FormField>

                  <FormField label="Slug (Permanent QR URL)" required error={errors.slug}>
                    <Input
                      value={edit.slug}
                      onChange={handleSlugChange}
                      placeholder="e.g. urban-brew"
                      className="font-mono text-xs"
                    />
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                      <span>Public QR:</span>
                      <span className="font-mono text-amber-700 font-semibold truncate">
                        {getSiteUrl()}/p/{edit.slug || "slug"}
                      </span>
                    </div>
                  </FormField>

                  <FormField label="Category" required error={errors.category_id}>
                    <Select
                      className="w-full"
                      value={edit.category_id}
                      onChange={(v) => {
                        setEdit({ ...edit, category_id: v });
                        if (errors.category_id) setErrors((prev) => ({ ...prev, category_id: "" }));
                      }}
                    >
                      <option value="">Select Category</option>
                      {cats.data?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </FormField>

                  <FormField label="Account Status">
                    <Select
                      className="w-full"
                      value={edit.status}
                      onChange={(v) => setEdit({ ...edit, status: v as any })}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                    </Select>
                  </FormField>

                  <FormField label="Description" className="sm:col-span-2 space-y-1.5" error={errors.description}>
                    <Textarea
                      value={edit.description}
                      onChange={setField("description")}
                      placeholder="Brief overview of this outlet for PennyGrade members..."
                      rows={3}
                    />
                  </FormField>
                </div>
              </div>

              {/* SECTION B: Branding & Contact */}
              <div>
                <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-slate-100">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-800">
                    <Globe className="h-3.5 w-3.5" />
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    B. Branding & Contact
                  </h4>
                </div>
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <FormField label="Logo URL" error={errors.logo_url}>
                    <Input
                      value={edit.logo_url}
                      onChange={setField("logo_url")}
                      placeholder="https://... logo image URL"
                    />
                  </FormField>

                  <FormField label="Cover Image URL" error={errors.cover_image_url}>
                    <Input
                      value={edit.cover_image_url}
                      onChange={setField("cover_image_url")}
                      placeholder="https://... storefront banner URL"
                    />
                  </FormField>

                  <FormField label="Contact Phone" error={errors.phone}>
                    <Input
                      value={edit.phone}
                      onChange={setField("phone")}
                      placeholder="+91 98765 43210"
                    />
                  </FormField>

                  <FormField label="Business Email" error={errors.email}>
                    <Input
                      type="email"
                      value={edit.email}
                      onChange={setField("email")}
                      placeholder="contact@outlet.in"
                    />
                  </FormField>

                  <FormField label="Official Website" className="sm:col-span-2 space-y-1.5" error={errors.website}>
                    <Input
                      value={edit.website}
                      onChange={setField("website")}
                      placeholder="https://outlet.in"
                    />
                  </FormField>
                </div>
              </div>

              {/* SECTION C: Location & Visibility */}
              <div>
                <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-slate-100">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-800">
                    <MapPin className="h-3.5 w-3.5" />
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    C. Location & Visibility
                  </h4>
                </div>
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <FormField label="Business Hours" className="sm:col-span-2 space-y-1.5">
                    <Input
                      value={edit.business_hours}
                      onChange={setField("business_hours")}
                      placeholder="Mon–Sun · 9:00 AM – 10:00 PM"
                    />
                  </FormField>

                  <FormField label="Street Address">
                    <Input
                      value={edit.address}
                      onChange={setField("address")}
                      placeholder="Main Road, Near Hospital Chowk"
                    />
                  </FormField>

                  <FormField label="City">
                    <Input
                      value={edit.city}
                      onChange={setField("city")}
                      placeholder="Daltonganj"
                    />
                  </FormField>

                  <FormField label="Latitude" error={errors.latitude}>
                    <Input
                      type="number"
                      step="any"
                      value={edit.latitude}
                      onChange={setField("latitude")}
                      placeholder="24.0384"
                    />
                  </FormField>

                  <FormField label="Longitude" error={errors.longitude}>
                    <Input
                      type="number"
                      step="any"
                      value={edit.longitude}
                      onChange={setField("longitude")}
                      placeholder="84.0682"
                    />
                  </FormField>

                  <div className="sm:col-span-2">
                    <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3 cursor-pointer hover:bg-slate-100/70 transition-colors">
                      <input
                        type="checkbox"
                        checked={edit.featured}
                        onChange={(e) => setEdit({ ...edit, featured: e.target.checked })}
                        className="h-4 w-4 mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          Feature this partner on public directory tops
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Featured partners receive priority ranking and gold badges across marketing and category listings.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* SECTION D: Initial Discount Offer (New Partners Only) */}
              {!edit.id && (
                <div>
                  <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-amber-200">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-800">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      D. Initial Discount Offer
                    </h4>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3.5">
                    <label className="flex items-center gap-2.5 text-xs font-bold text-amber-950 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                        checked={edit.create_offer}
                        onChange={(e) => setEdit({ ...edit, create_offer: e.target.checked })}
                      />
                      <span>Create initial discount offer for this partner now</span>
                    </label>

                    {edit.create_offer && (
                      <div className="grid gap-3 sm:grid-cols-2 pt-2.5 border-t border-amber-200/70">
                        <FormField label="Offer Title" required error={errors.offer_title}>
                          <Input
                            value={edit.offer_title}
                            onChange={setField("offer_title")}
                            placeholder="e.g. 10% Off on Food / Total Bill"
                            className="bg-white"
                          />
                        </FormField>

                        <FormField label="Discount Value" required error={errors.offer_discount_value}>
                          <Input
                            type="number"
                            value={edit.offer_discount_value}
                            onChange={(e) => setEdit({ ...edit, offer_discount_value: Number(e.target.value) })}
                            className="bg-white"
                          />
                        </FormField>

                        <FormField label="Discount Type">
                          <Select
                            className="w-full bg-white"
                            value={edit.offer_discount_type}
                            onChange={(v) => setEdit({ ...edit, offer_discount_type: v as any })}
                          >
                            <option value="PERCENTAGE">Percentage (%)</option>
                            <option value="FIXED">Flat (₹)</option>
                          </Select>
                        </FormField>

                        <FormField label="Minimum Bill (₹) — 0 for no minimum" error={errors.offer_min_bill}>
                          <Input
                            type="number"
                            value={edit.offer_min_bill}
                            onChange={(e) => setEdit({ ...edit, offer_min_bill: Number(e.target.value) })}
                            placeholder="0"
                            className="bg-white"
                          />
                        </FormField>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sticky Footer */}
          <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/90 shrink-0 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              * Required fields are validated before submission
            </span>
            <div className="flex items-center gap-2.5 ml-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEdit(null);
                  setErrors({});
                }}
                disabled={saving}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={save}
                disabled={saving}
                className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold min-w-[130px] cursor-pointer shadow-xs"
              >
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {saving ? "Saving..." : edit?.id ? "Save Changes" : "Create Partner"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FormField({
  label,
  required,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className || "space-y-1.5"}>
      <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
        <span>
          {label} {required && <span className="text-red-500 font-bold">*</span>}
        </span>
      </Label>
      {children}
      {error && <p className="text-[11px] font-medium text-red-500 mt-1">{error}</p>}
    </div>
  );
}
