import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, DataTable, td, TableSkeleton, Select, downloadCsv } from "@/components/admin-ui";
import { StatusBadge, LOGO_URL } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/use-session";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/cards")({ component: Cards });

type Card = { id: string; card_number: string; status: string; created_at: string; issued_at: string | null; membership: { membership_number: string; expiry_date: string; user_id: string } | null };

function Cards() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [count, setCount] = useState("100");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Card | null>(null);
  const q = useQuery({
    queryKey: ["admin", "cards"],
    queryFn: async () => {
      const [{ data }, { data: profs }] = await Promise.all([
        supabase.from("physical_cards").select("id,card_number,status,created_at,issued_at,membership:memberships(membership_number,expiry_date,user_id)").order("created_at", { ascending: false }).limit(5000),
        supabase.from("profiles").select("user_id,full_name"),
      ]);
      const pm = new Map((profs ?? []).map((p) => [p.user_id, p.full_name]));
      return ((data ?? []) as unknown as Card[]).map((c) => ({ ...c, member: c.membership ? pm.get(c.membership.user_id) ?? "" : "" }));
    },
  });
  const rows = (q.data ?? []).filter((c) => !status || c.status === status);
  const counts = (q.data ?? []).reduce<Record<string, number>>((a, c) => ({ ...a, [c.status]: (a[c.status] ?? 0) + 1 }), {});

  const generate = async () => {
    const n = Math.min(1000, Math.max(1, parseInt(count) || 0));
    setBusy(true);
    const { error } = await supabase.from("physical_cards").insert(Array.from({ length: n }, () => ({ status: "AVAILABLE" as const })));
    setBusy(false);
    if (error) return toast.error("Could not generate cards");
    await logAudit("Generated card batch", "physical_cards", null, { count: n });
    toast.success(`${n} cards generated`);
    qc.invalidateQueries({ queryKey: ["admin"] });
  };
  const setCardStatus = async (c: Card, s: "LOST" | "CANCELLED") => {
    const { error } = await supabase.from("physical_cards").update({ status: s }).eq("id", c.id);
    if (error) return toast.error("Not permitted");
    await logAudit(`Marked card ${s.toLowerCase()}`, "physical_card", c.id, { card_number: c.card_number });
    toast.success(`Card marked ${s.toLowerCase()}`); qc.invalidateQueries({ queryKey: ["admin"] });
  };

  return (
    <>
      <PageHeader title="Physical Cards" desc="Generate, export and manage printed membership cards" actions={<>
        <Select value={count} onChange={setCount}>{["100", "500", "1000", "10"].map((n) => <option key={n} value={n}>Generate {n}</option>)}</Select>
        <Button size="sm" onClick={generate} disabled={busy}>{busy ? "Generating…" : "Generate cards"}</Button>
        <Button size="sm" variant="outline" onClick={() => downloadCsv(`pennygrade-cards-${status || "all"}.csv`, [["Card Number", "Status", "Assigned Member", "Created", "Issued"], ...rows.map((c) => [c.card_number, c.status, (c as { member?: string }).member, c.created_at.slice(0, 10), c.issued_at?.slice(0, 10)])])}>Export CSV</Button></>} />
      <div className="mb-4 flex flex-wrap gap-2">
        {["", "AVAILABLE", "ACTIVE", "LOST", "CANCELLED"].map((s) => (
          <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>{s || "All"} {s ? `(${counts[s] ?? 0})` : `(${q.data?.length ?? 0})`}</Button>
        ))}
      </div>
      {q.isLoading ? <TableSkeleton /> : (
        <DataTable head={["Card Number", "Status", "Assigned Member", "Created", "Issued", "Actions"]} empty={!rows.length}>
          {rows.slice(0, 300).map((c) => (
            <tr key={c.id}>
              <td className={`${td} font-mono`}>{c.card_number}</td>
              <td className={td}><StatusBadge status={c.status} /></td>
              <td className={td}>{(c as { member?: string }).member || "—"}</td>
              <td className={td}>{c.created_at.slice(0, 10)}</td>
              <td className={td}>{c.issued_at?.slice(0, 10) ?? "—"}</td>
              <td className={`${td} space-x-1`}>
                <Button size="sm" variant="ghost" onClick={() => setPreview(c)}>Preview</Button>
                {(c.status === "ACTIVE" || c.status === "AVAILABLE") && <Button size="sm" variant="ghost" onClick={() => setCardStatus(c, "LOST")}>Mark lost</Button>}
                {c.status !== "CANCELLED" && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setCardStatus(c, "CANCELLED")}>Cancel</Button>}
              </td>
            </tr>
          ))}
        </DataTable>
      )}
      {rows.length > 300 && <p className="mt-2 text-xs text-muted-foreground">Showing first 300 — export CSV for the full list. Assign/replace cards from the Members page.</p>}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Card preview</DialogTitle></DialogHeader>
          {preview && <CardPreview number={preview.membership?.membership_number ?? preview.card_number} name={(preview as { member?: string }).member || "Member Name"} valid={preview.membership?.expiry_date} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CardPreview({ number, name, valid }: { number: string; name: string; valid?: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="relative aspect-[1.586/1] overflow-hidden rounded-xl bg-navy-deep text-navy-foreground shadow-lg">
        <img src={LOGO_URL} alt="PennyGrade logo" className="absolute inset-0 h-full w-full object-cover object-[50%_35%]" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="text-[9px] uppercase tracking-[0.3em] text-gold">Premium Membership</p>
          <p className="mt-0.5 font-mono text-sm tracking-widest">{number}</p>
          <div className="mt-1 flex justify-between text-[10px]"><span>{name}</span><span>Valid until {valid ? fmtDate(valid) : "—"}</span></div>
        </div>
      </div>
      <div className="flex aspect-[1.586/1] flex-col justify-between rounded-xl bg-navy p-4 text-navy-foreground shadow-lg">
        <p className="font-display font-semibold">Penny<span className="text-gold">Grade</span></p>
        <p className="text-xs">Present your membership when required.</p>
        <div className="text-[10px] text-navy-muted"><p>pennygrade.com · support@pennygrade.com</p><p className="mt-1">Non-transferable. Subject to PennyGrade terms. Not a payment card.</p></div>
      </div>
    </div>
  );
}
