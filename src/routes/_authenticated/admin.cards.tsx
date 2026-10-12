import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, DataTable, td, TableSkeleton, Select, downloadCsv } from "@/components/admin-ui";
import { StatusBadge, LOGO_URL, PhysicalCardPreview } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getAdminCards, generateCardBatch } from "@/lib/admin.functions";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/cards")({ component: Cards });

type Card = {
  id: string;
  card_number: string;
  status: string;
  created_at: string;
  issued_at: string | null;
  member?: string;
  membership_number?: string;
};

function Cards() {
  const qc = useQueryClient();
  const fetchCardsFn = useServerFn(getAdminCards);
  const generateBatchFn = useServerFn(generateCardBatch);

  const [status, setStatus] = useState("");
  const [count, setCount] = useState("100");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Card | null>(null);

  const q = useQuery({
    queryKey: ["admin", "cards"],
    queryFn: async () => {
      const cards = await fetchCardsFn();
      return (cards ?? []) as Card[];
    },
  });

  const rows = (q.data ?? []).filter((c) => !status || c.status === status);
  const counts = (q.data ?? []).reduce<Record<string, number>>(
    (a, c) => ({ ...a, [c.status]: (a[c.status] ?? 0) + 1 }),
    {}
  );

  const handleGenerate = async () => {
    const n = Math.min(1000, Math.max(1, parseInt(count) || 0));
    setBusy(true);
    try {
      const res = await generateBatchFn({ data: { count: n } });
      toast.success(`${res.count} cryptographically secure cards generated`);
      qc.invalidateQueries({ queryKey: ["admin"] });
    } catch {
      toast.error("Could not generate cards");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Physical Cards"
        desc="Generate, export and manage printed membership cards"
        actions={
          <>
            <Select value={count} onChange={setCount}>
              {["100", "500", "1000", "10"].map((n) => (
                <option key={n} value={n}>
                  Generate {n}
                </option>
              ))}
            </Select>
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={busy}
              className="bg-gold font-semibold text-accent-foreground hover:bg-gold-soft"
            >
              {busy ? "Generating…" : "Generate cards"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadCsv(
                  `pennygrade-cards-${status || "all"}.csv`,
                  [
                    ["Card Number", "Status", "Assigned Member", "Membership ID", "Created", "Issued"],
                    ...rows.map((c) => [
                      c.card_number,
                      c.status,
                      c.member || "—",
                      c.membership_number || "—",
                      c.created_at.slice(0, 10),
                      c.issued_at?.slice(0, 10) ?? "—",
                    ]),
                  ]
                )
              }
            >
              Export CSV
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {["", "AVAILABLE", "ACTIVE", "LOST", "CANCELLED"].map((s) => (
          <Button
            key={s}
            size="sm"
            variant={status === s ? "default" : "outline"}
            onClick={() => setStatus(s)}
          >
            {s || "All"} {s ? `(${counts[s] ?? 0})` : `(${q.data?.length ?? 0})`}
          </Button>
        ))}
      </div>

      {q.isLoading ? (
        <TableSkeleton />
      ) : (
        <DataTable
          head={["Card Number", "Status", "Assigned Member", "Created", "Issued", "Actions"]}
          empty={!rows.length}
        >
          {rows.slice(0, 300).map((c) => (
            <tr key={c.id}>
              <td className={`${td} font-mono font-semibold`}>{c.card_number}</td>
              <td className={td}><StatusBadge status={c.status} /></td>
              <td className={td}>{c.member || "—"}</td>
              <td className={td}>{c.created_at.slice(0, 10)}</td>
              <td className={td}>{c.issued_at?.slice(0, 10) ?? "—"}</td>
              <td className={`${td} space-x-1`}>
                <Button size="sm" variant="ghost" onClick={() => setPreview(c)}>
                  Preview
                </Button>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      {rows.length > 300 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Showing first 300 — export CSV for the full list. Assign and replace cards from the Members page.
        </p>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Card Preview</DialogTitle>
          </DialogHeader>
          {preview && (
            <CardPreview
              number={preview.card_number}
              name={preview.member || "PennyGrade Member"}
              valid="2027-10-07"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CardPreview({ number, name, valid }: { number: string; name: string; valid?: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <PhysicalCardPreview code={number} interactive={false} className="shadow-lg" />
      <div className="flex aspect-[1.586/1] flex-col justify-between rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-black p-5 text-white shadow-lg border border-slate-800">
        <p className="font-display font-semibold">Penny<span className="text-amber-400">Grade</span></p>
        <p className="text-xs text-slate-300">Present this physical membership card at partner checkout counter.</p>
        <div className="text-[10px] text-slate-400">
          <p>pennygrade.com · support@pennygrade.com</p>
          <p className="mt-1">Non-transferable. Subject to PennyGrade terms. Not a payment card.</p>
        </div>
      </div>
    </div>
  );
}
