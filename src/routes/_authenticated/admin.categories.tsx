import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp } from "lucide-react";
import { PageHeader, DataTable, td, TableSkeleton, Select } from "@/components/admin-ui";
import { StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/use-session";
import { CATEGORY_ICONS, categoryIcon } from "@/lib/queries";
import { slugify } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/categories")({ component: Categories });

type Cat = { id?: string; name: string; slug: string; icon: string | null; sort_order: number; status: "ACTIVE" | "INACTIVE" };

function Categories() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "categories"], queryFn: async () => ((await supabase.from("categories").select("*").order("sort_order")).data ?? []) as Cat[] });
  const [edit, setEdit] = useState<Cat | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin", "categories"] }); qc.invalidateQueries({ queryKey: ["public"] }); };

  const save = async () => {
    if (!edit?.name.trim()) return toast.error("Name required");
    const payload = { name: edit.name.trim(), slug: edit.slug || slugify(edit.name), icon: edit.icon, sort_order: edit.sort_order, status: edit.status };
    const { error } = edit.id ? await supabase.from("categories").update(payload).eq("id", edit.id) : await supabase.from("categories").insert(payload);
    if (error) return toast.error(error.code === "23505" ? "Slug already exists" : "Not permitted");
    await logAudit(edit.id ? "Updated category" : "Created category", "category", edit.id ?? null, payload);
    toast.success("Category saved"); setEdit(null); refresh();
  };
  const move = async (i: number, dir: -1 | 1) => {
    const list = q.data!; const j = i + dir; if (j < 0 || j >= list.length) return;
    await Promise.all([
      supabase.from("categories").update({ sort_order: j }).eq("id", list[i].id!),
      supabase.from("categories").update({ sort_order: i }).eq("id", list[j].id!),
    ]);
    refresh();
  };
  const toggle = async (c: Cat) => {
    const status = c.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await supabase.from("categories").update({ status }).eq("id", c.id!);
    await logAudit(`${status === "ACTIVE" ? "Activated" : "Deactivated"} category`, "category", c.id!, { name: c.name });
    refresh();
  };
  return (
    <>
      <PageHeader title="Categories" actions={<Button size="sm" onClick={() => setEdit({ name: "", slug: "", icon: "Sparkles", sort_order: q.data?.length ?? 0, status: "ACTIVE" })}>Add category</Button>} />
      {q.isLoading ? <TableSkeleton /> : (
        <DataTable head={["Order", "Category", "Slug", "Status", ""]} empty={!q.data?.length}>
          {q.data?.map((c, i) => { const I = categoryIcon(c.icon); return (
            <tr key={c.id}>
              <td className={td}><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button></div></td>
              <td className={`${td} font-medium`}><span className="flex items-center gap-2"><I className="h-4 w-4" />{c.name}</span></td>
              <td className={`${td} text-muted-foreground`}>{c.slug}</td>
              <td className={td}><StatusBadge status={c.status} /></td>
              <td className={`${td} space-x-1`}><Button size="sm" variant="ghost" onClick={() => setEdit(c)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => toggle(c)}>{c.status === "ACTIVE" ? "Deactivate" : "Activate"}</Button></td>
            </tr>); })}
        </DataTable>
      )}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent><DialogHeader><DialogTitle>{edit?.id ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
          {edit && <div className="space-y-3">
            <div className="space-y-1.5"><Label>Name</Label><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value, slug: edit.id ? edit.slug : slugify(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>Slug</Label><Input value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: slugify(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>Icon</Label><Select className="w-full" value={edit.icon ?? ""} onChange={(v) => setEdit({ ...edit, icon: v })}>{Object.keys(CATEGORY_ICONS).map((k) => <option key={k}>{k}</option>)}</Select></div>
            <Button className="w-full" onClick={save}>Save</Button>
          </div>}
        </DialogContent>
      </Dialog>
    </>
  );
}
