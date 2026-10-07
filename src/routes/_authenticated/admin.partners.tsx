import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Star } from "lucide-react";
import { PageHeader, DataTable, td, TableSkeleton, Select } from "@/components/admin-ui";
import { StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/use-session";
import { slugify } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/partners")({ component: Partners });

const EMPTY = { business_name: "", slug: "", category_id: "", description: "", logo_url: "", cover_image_url: "", phone: "", email: "", website: "", address: "", city: "", latitude: "", longitude: "", business_hours: "", status: "ACTIVE", featured: false };
type Form = typeof EMPTY & { id?: string };

function Partners() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "partners"], queryFn: async () => (await supabase.from("partners").select("*, category:categories(name), offers(id,status)").order("business_name")).data ?? [] });
  const cats = useQuery({ queryKey: ["admin", "categories"], queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [] });
  const [edit, setEdit] = useState<Form | null>(null);
  const [search, setSearch] = useState("");
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin"] }); qc.invalidateQueries({ queryKey: ["public"] }); };

  const upd = async (id: string, patch: Record<string, unknown>, action: string, name: string) => {
    const { error } = await supabase.from("partners").update(patch as never).eq("id", id);
    if (error) return toast.error("Not permitted");
    await logAudit(action, "partner", id, { name, ...patch }); toast.success(action); refresh();
  };
  const save = async () => {
    if (!edit || !edit.business_name.trim() || !edit.category_id) return toast.error("Name and category are required");
    const { id, ...f } = edit;
    const num = (v: string) => (v === "" ? null : Number(v));
    const payload = { ...f, slug: f.slug || slugify(f.business_name), latitude: num(String(f.latitude)), longitude: num(String(f.longitude)), status: f.status as "ACTIVE" };
    const { error } = id ? await supabase.from("partners").update(payload).eq("id", id) : await supabase.from("partners").insert(payload);
    if (error) return toast.error(error.code === "23505" ? "That slug is already used" : "Could not save partner");
    await logAudit(id ? "Updated partner" : "Created partner", "partner", id ?? payload.slug, { name: payload.business_name });
    toast.success(id ? "Partner updated" : "Partner created"); setEdit(null); refresh();
  };
  const list = (q.data ?? []).filter((p) => !search || p.business_name.toLowerCase().includes(search.toLowerCase()));
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setEdit({ ...edit!, [k]: e.target.value });

  return (
    <>
      <PageHeader title="Partners" desc={`${q.data?.length ?? 0} partners`} actions={<Button size="sm" onClick={() => setEdit({ ...EMPTY })}>Add partner</Button>} />
      <Input placeholder="Search partners" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 h-9 max-w-xs bg-card" />
      {q.isLoading ? <TableSkeleton /> : (
        <DataTable head={["Partner", "Category", "City", "Offers", "Status", "Featured", ""]} empty={!list.length}>
          {list.map((p) => (
            <tr key={p.id}>
              <td className={td}><p className="font-medium">{p.business_name}</p><p className="text-xs text-muted-foreground">/{p.slug}</p></td>
              <td className={td}>{p.category?.name}</td>
              <td className={td}>{p.city}</td>
              <td className={td}><Link to="/admin/offers" search={{ partner: p.id }} className="underline">{p.offers.filter((o) => o.status === "ACTIVE").length} active</Link></td>
              <td className={td}><StatusBadge status={p.status} /></td>
              <td className={td}>{p.featured && <Star className="h-4 w-4 fill-gold text-gold" />}</td>
              <td className={td}>
                <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEdit({ ...EMPTY, ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v ?? ""])), featured: p.featured } as Form)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => upd(p.id, { featured: !p.featured }, p.featured ? "Unfeatured partner" : "Featured partner", p.business_name)}>{p.featured ? "Unfeature" : "Feature"}</DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/admin/qr-codes">QR code</Link></DropdownMenuItem>
                    {p.status !== "ACTIVE" && <DropdownMenuItem onClick={() => upd(p.id, { status: "ACTIVE" }, "Activated partner", p.business_name)}>Activate</DropdownMenuItem>}
                    {p.status !== "INACTIVE" && <DropdownMenuItem onClick={() => upd(p.id, { status: "INACTIVE" }, "Deactivated partner", p.business_name)}>Deactivate</DropdownMenuItem>}
                    {p.status !== "SUSPENDED" && <DropdownMenuItem className="text-destructive" onClick={() => upd(p.id, { status: "SUSPENDED" }, "Suspended partner", p.business_name)}>Suspend</DropdownMenuItem>}
                  </DropdownMenuContent></DropdownMenu>
              </td>
            </tr>
          ))}
        </DataTable>
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
