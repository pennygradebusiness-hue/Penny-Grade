import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageHeader, DataTable, td, TableSkeleton, Select, downloadCsv } from "@/components/admin-ui";
import { StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchLogs } from "@/lib/admin-data";
import { fmtDateTime, inr, maskId } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/verifications")({ component: Logs });

function Logs() {
  const q = useQuery({ queryKey: ["admin", "logs"], queryFn: () => fetchLogs(365) });
  const [f, setF] = useState({ from: "", to: "", member: "", partner: "", category: "", offer: "", status: "" });
  const opts = (fn: (l: NonNullable<typeof q.data>[number]) => string | undefined) => [...new Set((q.data ?? []).map(fn).filter(Boolean))] as string[];
  const rows = useMemo(() => (q.data ?? []).filter((l) => {
    const d = l.created_at.slice(0, 10);
    if (f.from && d < f.from) return false;
    if (f.to && d > f.to) return false;
    if (f.member && !l.membership?.membership_number.toLowerCase().includes(f.member.toLowerCase())) return false;
    if (f.partner && l.partner?.business_name !== f.partner) return false;
    if (f.category && l.partner?.category?.name !== f.category) return false;
    if (f.offer && l.offer?.title !== f.offer) return false;
    if (f.status && l.status !== f.status) return false;
    return true;
  }), [q.data, f]);
  return (
    <>
      <PageHeader title="Verification Logs" desc={`${rows.length} verifications`} actions={
        <Button size="sm" variant="outline" onClick={() => downloadCsv("verifications.csv", [["Verification ID", "Member", "Partner", "Offer", "Bill", "Discount", "Final", "Date"], ...rows.map((l) => [l.verification_session_id, maskId(l.membership?.membership_number), l.partner?.business_name, l.offer?.title, l.bill_amount, l.discount_amount, l.final_amount, l.created_at])])}>Export</Button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input type="date" className="h-9 w-auto bg-card" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
        <Input type="date" className="h-9 w-auto bg-card" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
        <Input placeholder="Membership ID" className="h-9 w-40 bg-card" value={f.member} onChange={(e) => setF({ ...f, member: e.target.value })} />
        <Select value={f.partner} onChange={(v) => setF({ ...f, partner: v })}><option value="">All partners</option>{opts((l) => l.partner?.business_name).map((o) => <option key={o}>{o}</option>)}</Select>
        <Select value={f.category} onChange={(v) => setF({ ...f, category: v })}><option value="">All categories</option>{opts((l) => l.partner?.category?.name).map((o) => <option key={o}>{o}</option>)}</Select>
        <Select value={f.offer} onChange={(v) => setF({ ...f, offer: v })}><option value="">All offers</option>{opts((l) => l.offer?.title).map((o) => <option key={o}>{o}</option>)}</Select>
        <Select value={f.status} onChange={(v) => setF({ ...f, status: v })}><option value="">All statuses</option><option>VERIFIED</option></Select>
      </div>
      {q.isLoading ? <TableSkeleton /> : q.error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-medium text-destructive">Failed to load verification history</p>
          <p className="mt-1 text-xs text-muted-foreground">{(q.error as Error).message}</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => q.refetch()}>Retry</Button>
        </div>
      ) : (
        <DataTable head={["Member", "Partner", "Bill", "Discount", "Final amount", "Date/time", "Verification ID", "Status"]} empty={!rows.length}>
          {rows.slice(0, 500).map((l) => (
            <tr key={l.id}>
              <td className={`${td} font-mono text-xs`}>{maskId(l.membership?.membership_number)}</td>
              <td className={td}>{l.partner?.business_name}</td>
              <td className={`${td} tabular`}>{inr(l.bill_amount)}</td>
              <td className={`${td} tabular text-success`}>{inr(l.discount_amount)}</td>
              <td className={`${td} tabular font-medium`}>{inr(l.final_amount)}</td>
              <td className={td}>{fmtDateTime(l.created_at)}</td>
              <td className={`${td} font-mono text-xs`}>{l.verification_session_id?.slice(0, 8).toUpperCase()}</td>
              <td className={td}><StatusBadge status={l.status} /></td>
            </tr>
          ))}
        </DataTable>
      )}
    </>
  );
}
