import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { PageHeader, DataTable, td, TableSkeleton, Select } from "@/components/admin-ui";
import { StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/use-session";
import { DAYS, formatDays, inr, offerHeadline } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/offers")({
  validateSearch: z.object({ partner: z.string().optional() }),
  component: Offers,
});

const EMPTY = { partner_id: "", title: "", description: "", discount_type: "PERCENTAGE" as "PERCENTAGE" | "FIXED", discount_value: 10, max_discount: "" as number | "", minimum_bill: 0, valid_from: "", valid_until: "", valid_days: [0, 1, 2, 3, 4, 5, 6], terms_conditions: "", status: "ACTIVE" as "ACTIVE" | "INACTIVE" };
type Form = typeof EMPTY & { id?: string };

function Offers() {
  const { partner } = Route.useSearch();
  const qc = useQueryClient();
  const [pf, setPf] = useState(partner ?? "");
  const q = useQuery({ queryKey: ["admin", "offers"], queryFn: async () => (await supabase.from("offers").select("*, partner:partners(business_name)").order("created_at", { ascending: false })).data ?? [] });
  const partners = useQuery({ queryKey: ["admin", "partners-min"], queryFn: async () => (await supabase.from("partners").select("id,business_name").order("business_name")).data ?? [] });
  const [edit, setEdit] = useState<Form | null>(null);
  const list = (q.data ?? []).filter((o) => !pf || o.partner_id === pf);

  const save = async () => {
    if (!edit?.partner_id || !edit.title || !(edit.discount_value > 0)) return toast.error("Partner, title and discount are required");
    if (edit.discount_type === "PERCENTAGE" && edit.discount_value > 100) return toast.error("Percentage cannot exceed 100");
    if (!edit.valid_days.length) return toast.error("Select at least one valid day");
    const { id, ...f } = edit;
    const payload = { ...f, max_discount: f.max_discount === "" ? null : Number(f.max_discount), valid_from: f.valid_from || null, valid_until: f.valid_until || null };
    const { error } = id ? await supabase.from("offers").update(payload).eq("id", id) : await supabase.from("offers").insert(payload);
    if (error) return toast.error("Could not save offer");
    await logAudit(id ? "Changed offer" : "Created offer", "offer", id ?? null, { title: payload.title, discount: `${payload.discount_type} ${payload.discount_value}`, max: payload.max_discount, min: payload.minimum_bill });
    toast.success(id ? "Offer updated" : "Offer created"); setEdit(null);
    qc.invalidateQueries({ queryKey: ["admin"] }); qc.invalidateQueries({ queryKey: ["public"] });
  };
  const toggleDay = (d: number) => setEdit({ ...edit!, valid_days: edit!.valid_days.includes(d) ? edit!.valid_days.filter((x) => x !== d) : [...edit!.valid_days, d].sort() });

  return (
    <>
      <PageHeader title="Offers" desc="Partner QR codes always show the current active offer." actions={<Button size="sm" onClick={() => setEdit({ ...EMPTY, partner_id: pf })}>Create offer</Button>} />
      <Select className="mb-4" value={pf} onChange={setPf}><option value="">All partners</option>{partners.data?.map((p) => <option key={p.id} value={p.id}>{p.business_name}</option>)}</Select>
      {q.isLoading ? <TableSkeleton /> : (
        <DataTable head={["Partner", "Offer", "Discount", "Max", "Min bill", "Days", "Validity", "Status", ""]} empty={!list.length}>
          {list.map((o) => (
            <tr key={o.id}>
              <td className={`${td} font-medium`}>{o.partner?.business_name}</td>
              <td className={td}>{o.title}</td>
              <td className={td}>{offerHeadline(o)}</td>
              <td className={td}>{o.max_discount ? inr(o.max_discount) : "—"}</td>
              <td className={td}>{inr(o.minimum_bill)}</td>
              <td className={td}>{formatDays(o.valid_days)}</td>
              <td className={td}>{o.valid_from || "∞"} → {o.valid_until || "∞"}</td>
              <td className={td}><StatusBadge status={o.status} /></td>
              <td className={td}><Button size="sm" variant="ghost" onClick={() => setEdit({ ...EMPTY, ...o, description: o.description ?? "", terms_conditions: o.terms_conditions ?? "", max_discount: o.max_discount ?? "", valid_from: o.valid_from ?? "", valid_until: o.valid_until ?? "" })}>Edit</Button></td>
            </tr>
          ))}
        </DataTable>
      )}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto"><DialogHeader><DialogTitle>{edit?.id ? "Edit offer" : "New offer"}</DialogTitle></DialogHeader>
          {edit && <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><F l="Partner"><Select className="w-full" value={edit.partner_id} onChange={(v) => setEdit({ ...edit, partner_id: v })}><option value="">Select partner</option>{partners.data?.map((p) => <option key={p.id} value={p.id}>{p.business_name}</option>)}</Select></F></div>
            <F l="Offer title"><Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="10% Off" /></F>
            <F l="Discount type"><Select className="w-full" value={edit.discount_type} onChange={(v) => setEdit({ ...edit, discount_type: v as "FIXED" })}><option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed amount</option></Select></F>
            <F l={edit.discount_type === "PERCENTAGE" ? "Discount (%)" : "Discount (₹)"}><Input type="number" value={edit.discount_value} onChange={(e) => setEdit({ ...edit, discount_value: Number(e.target.value) })} /></F>
            <F l="Maximum discount (₹)"><Input type="number" value={edit.max_discount} onChange={(e) => setEdit({ ...edit, max_discount: e.target.value === "" ? "" : Number(e.target.value) })} placeholder="No cap" /></F>
            <F l="Minimum bill (₹)"><Input type="number" value={edit.minimum_bill} onChange={(e) => setEdit({ ...edit, minimum_bill: Number(e.target.value) })} /></F>
            <F l="Usage"><Input value="Unlimited" disabled /></F>
            <F l="Valid from"><Input type="date" value={edit.valid_from} onChange={(e) => setEdit({ ...edit, valid_from: e.target.value })} /></F>
            <F l="Valid until"><Input type="date" value={edit.valid_until} onChange={(e) => setEdit({ ...edit, valid_until: e.target.value })} /></F>
            <div className="sm:col-span-2"><F l="Valid days"><div className="flex flex-wrap gap-1.5">{DAYS.map((d, i) => (
              <button key={d} type="button" onClick={() => toggleDay(i)} className={`rounded-md border px-3 py-1.5 text-sm ${edit.valid_days.includes(i) ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>{d}</button>))}</div></F></div>
            <div className="sm:col-span-2"><F l="Description"><Input value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></F></div>
            <div className="sm:col-span-2"><F l="Terms & conditions"><Textarea value={edit.terms_conditions} onChange={(e) => setEdit({ ...edit, terms_conditions: e.target.value })} placeholder="Valid on dine-in bills only. Cannot be combined with other offers." /></F></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.status === "ACTIVE"} onChange={(e) => setEdit({ ...edit, status: e.target.checked ? "ACTIVE" : "INACTIVE" })} />Active</label>
            <Button className="sm:col-span-2" onClick={save}>Save offer</Button>
          </div>}
        </DialogContent>
      </Dialog>
    </>
  );
}
function F({ l, children }: { l: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{l}</Label>{children}</div>;
}
