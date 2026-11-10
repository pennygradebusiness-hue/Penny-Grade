import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader, DataTable, td, TableSkeleton } from "@/components/admin-ui";
import { StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/use-session";
import { inr } from "@/lib/format";
import { getAdminMutationErrorMessage } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/admin/plans")({ component: Plans });

type Plan = { id?: string; name: string; description: string | null; price: number; duration_days: number; benefits: string[]; card_included: boolean; status: "ACTIVE" | "INACTIVE" };

const SIX_MONTH_CARD_BENEFITS = [
  "Six-month access to PennyGrade's participating local business network",
  "One physical membership card with a unique membership identifier",
  "Access to current partner offers and their eligibility conditions",
  "Online membership verification where supported",
  "Card delivery currently available in Daltonganj, Jharkhand",
];

function Plans() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin", "plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("membership_plans").select("*").order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [edit, setEdit] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const save = async () => {
    if (savingRef.current) return;
    if (!edit || !edit.name.trim() || !Number.isFinite(edit.price) || edit.price < 0 || !Number.isInteger(edit.duration_days) || edit.duration_days < 1) {
      return toast.error("Check the plan details and try again.");
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const benefits = edit.benefits.map((benefit) => benefit.trim()).filter(Boolean);
      const payload = { name: edit.name.trim(), description: edit.description?.trim() || null, price: edit.price, duration_days: edit.duration_days, benefits, card_included: edit.card_included, status: edit.status };
      if (edit.id) {
        const { data, error } = await supabase
          .from("membership_plans")
          .update(payload)
          .eq("id", edit.id)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        if (!data) throw Object.assign(new Error("No row updated"), { code: "PGRST116" });
      } else {
        const { data, error } = await supabase
          .from("membership_plans")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        if (!data) throw new Error("Insert returned no row");
      }

      await logAudit(edit.id ? "Updated plan" : "Created plan", "membership_plan", edit.id ?? null, payload);
      setEdit(null);
      toast.success("Changes saved.");
      await qc.invalidateQueries({ queryKey: ["admin", "plans"] });
      await qc.refetchQueries({ queryKey: ["admin", "plans"], type: "active" });
    } catch (error) {
      console.error("Membership plan save failed", {
        code: error && typeof error === "object" && "code" in error ? (error as { code?: unknown }).code : undefined,
      });
      toast.error(getAdminMutationErrorMessage(error));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  const list = (q.data ?? []).map((p) => ({
    ...p,
    name: p.name,
    description: p.description,
  }));

  return (
    <>
      <PageHeader title="Membership Plans" desc="Active plans supply the server-side checkout price, duration and included benefits." actions={<Button size="sm" onClick={() => setEdit({ name: "", description: "", price: 500, duration_days: 180, benefits: SIX_MONTH_CARD_BENEFITS, card_included: true, status: "ACTIVE" })}>Add plan</Button>} />
      {q.isLoading ? <TableSkeleton /> : (
        <DataTable head={["Name", "Price", "Duration", "Physical card", "Status", ""]} empty={!list.length}>
          {list.map((p) => (
            <tr key={p.id}><td className={`${td} font-medium`}>{p.name}</td><td className={td}>{inr(p.price)}</td><td className={td}>{p.duration_days} days</td><td className={td}>{p.card_included ? "Included" : "Not included"}</td><td className={td}><StatusBadge status={p.status} /></td>
              <td className={td}><Button size="sm" variant="ghost" onClick={() => setEdit({ ...p, benefits: Array.isArray(p.benefits) ? p.benefits : [] } as Plan)}>Edit</Button></td></tr>
          ))}
        </DataTable>
      )}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent><DialogHeader><DialogTitle>{edit?.id ? "Edit plan" : "New plan"}</DialogTitle></DialogHeader>
          {edit && <div className="space-y-3">
            <div className="space-y-1.5"><Label>Name</Label><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Description</Label><Input value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Included benefits (one per line)</Label><Textarea rows={5} value={edit.benefits.join("\n")} onChange={(e) => setEdit({ ...edit, benefits: e.target.value.split("\n") })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Price (₹)</Label><Input type="number" value={edit.price} onChange={(e) => setEdit({ ...edit, price: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Duration (days)</Label><Input type="number" value={edit.duration_days} onChange={(e) => setEdit({ ...edit, duration_days: Number(e.target.value) })} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.card_included} onChange={(e) => setEdit({ ...edit, card_included: e.target.checked })} />Physical card included</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.status === "ACTIVE"} onChange={(e) => setEdit({ ...edit, status: e.target.checked ? "ACTIVE" : "INACTIVE" })} />Active</label>
            <Button className="w-full" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
          </div>}
        </DialogContent>
      </Dialog>
    </>
  );
}
