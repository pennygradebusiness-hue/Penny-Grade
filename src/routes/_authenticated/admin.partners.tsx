import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Star, Phone, CheckCircle2, Trash2 } from "lucide-react";
import { PageHeader, DataTable, td, TableSkeleton, Select } from "@/components/admin-ui";
import { StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

  const [tab, setTab] = useState<"partners" | "inquiries">("partners");
  const q = useQuery({
    queryKey: ["admin", "partners"],
    queryFn: async () => {
      try {
        const res = await fetchPartnersFn();
        if (res && res.length > 0) return res as V1Partner[];
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

  const [edit, setEdit] = useState<Form | null>(null);
  const [search, setSearch] = useState("");
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin"] });
    qc.invalidateQueries({ queryKey: ["public"] });
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
    if (!edit || !edit.business_name.trim() || !edit.category_id) {
      return toast.error("Business name and category are required");
    }
    const { id, ...f } = edit;
    const num = (v: string | number | null | undefined) => (v === "" || v === null || v === undefined ? null : Number(v));
    const allCats = cats.data && cats.data.length > 0 ? cats.data : DEFAULT_CATEGORIES;
    const matchedCat = allCats.find((c) => c.id === f.category_id);

    try {
      await savePartnerFn({
        data: {
          id: id || undefined,
          business_name: f.business_name.trim(),
          slug: f.slug?.trim() || slugify(f.business_name),
          category_id: f.category_id,
          category_name: matchedCat?.name || "General",
          description: f.description || "",
          logo_url: f.logo_url || "",
          cover_image_url: f.cover_image_url || "",
          phone: f.phone || "",
          email: f.email || "",
          website: f.website || "",
          address: f.address || "",
          city: f.city || "Daltonganj",
          latitude: num(f.latitude),
          longitude: num(f.longitude),
          business_hours: f.business_hours || "",
          status: (f.status || "ACTIVE") as "ACTIVE" | "INACTIVE" | "SUSPENDED",
          featured: !!f.featured,
        },
      });
      try {
        const sbPayload: any = {
          business_name: f.business_name.trim(),
          slug: f.slug?.trim() || slugify(f.business_name),
          category_id: f.category_id,
          description: f.description || "",
          logo_url: f.logo_url || null,
          cover_image_url: f.cover_image_url || null,
          phone: f.phone || null,
          email: f.email || null,
          website: f.website || null,
          address: f.address || null,
          city: f.city || "Daltonganj",
          latitude: num(f.latitude),
          longitude: num(f.longitude),
          business_hours: f.business_hours || null,
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
      toast.success(id ? "Partner updated successfully" : "Partner created successfully");
      setEdit(null);
      refresh();
    } catch (err: any) {
      toast.error(err?.message || "Could not save partner");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) return;
    try {
      await deletePartnerFn({ data: { id } });
      try {
        await supabase.from("partners").delete().eq("id", id);
      } catch {
        // ignore
      }
      toast.success(`Partner "${name}" deleted`);
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
          <Button size="sm" onClick={() => setEdit({ ...EMPTY })} className="bg-gold font-bold text-accent-foreground hover:bg-gold-soft">
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
                return (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className={td}><p className="font-bold text-navy">{p.business_name}</p><p className="text-xs text-muted-foreground font-mono">/{p.slug}</p></td>
                    <td className={td}><span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{catName}</span></td>
                    <td className={td}>{p.city || "Daltonganj"}</td>
                    <td className={td}><Link to="/admin/offers" search={{ partner: p.id }} className="underline text-xs font-medium text-amber-700">View offers</Link></td>
                    <td className={td}><StatusBadge status={p.status} /></td>
                    <td className={td}>{p.featured && <Star className="h-4 w-4 fill-gold text-gold" />}</td>
                    <td className={td}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="cursor-pointer"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem className="cursor-pointer" onClick={() => setEdit({ ...EMPTY, ...p, latitude: String(p.latitude ?? ""), longitude: String(p.longitude ?? "") } as Form)}>
                            Edit details
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
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>{edit?.id ? "Edit partner" : "New partner"}</DialogTitle></DialogHeader>
          {edit && <div className="grid gap-3 sm:grid-cols-2">
            <F l="Business name"><Input value={edit.business_name} onChange={(e) => setEdit({ ...edit, business_name: e.target.value, slug: edit.id ? edit.slug : slugify(e.target.value) })} /></F>
            <F l="Slug (QR URL — keep permanent)"><Input value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: slugify(e.target.value) })} /></F>
            <F l="Category"><Select className="w-full" value={edit.category_id} onChange={(v) => setEdit({ ...edit, category_id: v })}><option value="">Select</option>{cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></F>
            <F l="Status"><Select className="w-full" value={edit.status} onChange={(v) => setEdit({ ...edit, status: v })}>{["ACTIVE", "INACTIVE", "SUSPENDED"].map((s) => <option key={s}>{s}</option>)}</Select></F>
            <div className="sm:col-span-2"><F l="Description"><Textarea value={edit.description} onChange={set("description")} /></F></div>
            <F l="Logo URL"><Input value={edit.logo_url} onChange={set("logo_url")} placeholder="https://" /></F>
            <F l="Cover image URL"><Input value={edit.cover_image_url} onChange={set("cover_image_url")} placeholder="https://" /></F>
            <F l="Phone"><Input value={edit.phone} onChange={set("phone")} /></F>
            <F l="Email"><Input value={edit.email} onChange={set("email")} /></F>
            <F l="Website"><Input value={edit.website} onChange={set("website")} /></F>
            <F l="Business hours"><Input value={edit.business_hours} onChange={set("business_hours")} placeholder="Mon–Sun · 9 AM – 10 PM" /></F>
            <F l="Address"><Input value={edit.address} onChange={set("address")} /></F>
            <F l="City"><Input value={edit.city} onChange={set("city")} /></F>
            <F l="Latitude"><Input value={edit.latitude} onChange={set("latitude")} /></F>
            <F l="Longitude"><Input value={edit.longitude} onChange={set("longitude")} /></F>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.featured} onChange={(e) => setEdit({ ...edit, featured: e.target.checked })} />Featured</label>
            <Button className="sm:col-span-2" onClick={save}>Save partner</Button>
          </div>}
        </DialogContent>
      </Dialog>
    </>
  );
}
function F({ l, children }: { l: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{l}</Label>{children}</div>;
}
