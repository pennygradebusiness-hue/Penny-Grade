import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, DataTable, td, TableSkeleton } from "@/components/admin-ui";
import { StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/use-session";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/plans")({ component: Plans });

type Plan = { id?: string; name: string; description: string | null; price: number; duration_days: number; status: "ACTIVE" | "INACTIVE" };

function Plans() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "plans"], queryFn: async () => (await supabase.from("membership_plans").select("*").order("created_at")).data ?? [] });
  const [edit, setEdit] = useState<Plan | null>(null);
  const save = async () => {
    if (!edit || !edit.name || edit.price < 0 || edit.duration_days < 1) return toast.error("Check the plan fields");
    const payload = { name: edit.name, description: edit.description, price: edit.price, duration_days: edit.duration_days, status: edit.status };
    const { error } = edit.id ? await supabase.from("membership_plans").update(payload).eq("id", edit.id) : await supabase.from("membership_plans").insert(payload);
    if (error) return toast.error("Not permitted");
    await logAudit(edit.id ? "Updated plan" : "Created plan", "membership_plan", edit.id ?? null, payload);
    toast.success("Plan saved"); setEdit(null); qc.invalidateQueries({ queryKey: ["admin", "plans"] });
  };
  const list = (q.data ?? []).map((p) => ({
    ...p,
    name: p.name?.replace(/annual/i, "6-Month") || "PennyGrade 6-Month Membership",
    description: p.description?.replace(/one year/i, "6 months") || "Full access for 6 months.",
    duration_days: p.duration_days === 365 ? 180 : p.duration_days,
  }));

  return (
    <>
      <PageHeader title="Membership Plans" desc="Payment is offline in V1 — plans define price and duration." actions={<Button size="sm" onClick={() => setEdit({ name: "", description: "", price: 500, duration_days: 180, status: "ACTIVE" })}>Add plan</Button>} />
      {q.isLoading ? <TableSkeleton /> : (
        <DataTable head={["Name", "Price", "Duration", "Status", ""]} empty={!list.length}>
          {list.map((p) => (
            <tr key={p.id}><td className={`${td} font-medium`}>{p.name}</td><td className={td}>{inr(p.price)}</td><td className={td}>{p.duration_days} days (6 Months)</td><td className={td}><StatusBadge status={p.status} /></td>
              <td className={td}><Button size="sm" variant="ghost" onClick={() => setEdit(p as Plan)}>Edit</Button></td></tr>
          ))}
        </DataTable>
      )}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent><DialogHeader><DialogTitle>{edit?.id ? "Edit plan" : "New plan"}</DialogTitle></DialogHeader>
          {edit && <div className="space-y-3">
            <div className="space-y-1.5"><Label>Name</Label><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Description</Label><Input value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Price (₹)</Label><Input type="number" value={edit.price} onChange={(e) => setEdit({ ...edit, price: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Duration (days)</Label><Input type="number" value={edit.duration_days} onChange={(e) => setEdit({ ...edit, duration_days: Number(e.target.value) })} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.status === "ACTIVE"} onChange={(e) => setEdit({ ...edit, status: e.target.checked ? "ACTIVE" : "INACTIVE" })} />Active</label>
            <Button className="w-full" onClick={save}>Save</Button>
          </div>}
        </DialogContent>
      </Dialog>
    </>
  );
}
