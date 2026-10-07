import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, Panel, Stat, TableSkeleton, Chart } from "@/components/admin-ui";
import { supabase } from "@/integrations/supabase/client";
import { fetchLogs, groupSum, lastMonths, monthKey } from "@/lib/admin-data";
import { inr, maskId } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/reports")({ component: Reports });
const axis = { fontSize: 11, stroke: "var(--muted-foreground)" };

function Reports() {
  const q = useQuery({ queryKey: ["admin", "reports"], queryFn: () => fetchLogs(365) });
  const profs = useQuery({ queryKey: ["admin", "profiles-min"], queryFn: async () => (await supabase.from("profiles").select("user_id,full_name")).data ?? [] });
  if (q.isLoading || !q.data) return <><PageHeader title="Reports" /><TableSkeleton /></>;
  const logs = q.data;
  const pm = new Map((profs.data ?? []).map((p) => [p.user_id, p.full_name]));
  const total = logs.reduce((s, l) => s + Number(l.discount_amount), 0);
  const billTotal = logs.reduce((s, l) => s + Number(l.bill_amount), 0);
  const months = lastMonths(12);
  const mc = groupSum(logs, (l) => monthKey(l.created_at));
  const mv = groupSum(logs, (l) => monthKey(l.created_at), (l) => Number(l.discount_amount));
  const trend = months.map((m) => ({ m, count: mc.get(m) ?? 0, value: mv.get(m) ?? 0 }));
  const table = (m: Map<string, number>, v?: Map<string, number>) => [...m].map(([k, c]) => ({ k, c, v: v?.get(k) ?? 0 })).sort((a, b) => b.c - a.c);
  const partners = table(groupSum(logs, (l) => l.partner?.business_name ?? "—"), groupSum(logs, (l) => l.partner?.business_name ?? "—", (l) => Number(l.discount_amount)));
  const cats = table(groupSum(logs, (l) => l.partner?.category?.name ?? "Other"), groupSum(logs, (l) => l.partner?.category?.name ?? "Other", (l) => Number(l.discount_amount)));
  const memberKey = (l: (typeof logs)[number]) => `${pm.get(l.user_id) || "Member"} · ${maskId(l.membership?.membership_number)}`;
  const members = table(groupSum(logs, memberKey), groupSum(logs, memberKey, (l) => Number(l.discount_amount))).slice(0, 10);

  return (
    <>
      <PageHeader title="Reports" desc="Last 12 months" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Verifications" value={logs.length} />
        <Stat label="Est. discount value" value={inr(total)} />
        <Stat label="Member spend at partners" value={inr(billTotal)} />
        <Stat label="Active members (used)" value={new Set(logs.map((l) => l.user_id)).size} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Monthly verification volume"><Chart><BarChart data={trend}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="m" {...axis} /><YAxis {...axis} allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="var(--chart-1)" radius={[6, 6, 0, 0]} /></BarChart></Chart></Panel>
        <Panel title="Estimated discount value trend"><Chart><LineChart data={trend}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="m" {...axis} /><YAxis {...axis} /><Tooltip formatter={(v: number) => inr(v)} /><Line dataKey="value" stroke="var(--chart-2)" strokeWidth={2.5} dot={false} /></LineChart></Chart></Panel>
        <RankTable title="Partner performance · most-used partners" rows={partners} />
        <RankTable title="Category performance" rows={cats} />
        <RankTable title="Most-active members" rows={members} />
      </div>
    </>
  );
}

function RankTable({ title, rows }: { title: string; rows: { k: string; c: number; v: number }[] }) {
  return (
    <Panel title={title}>
      {!rows.length ? <p className="text-sm text-muted-foreground">No data yet.</p> : (
        <table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="pb-2">Name</th><th className="pb-2 text-right">Verifications</th><th className="pb-2 text-right">Discount</th></tr></thead>
          <tbody className="divide-y">{rows.map((r) => <tr key={r.k}><td className="py-2">{r.k}</td><td className="tabular py-2 text-right">{r.c}</td><td className="tabular py-2 text-right">{inr(r.v)}</td></tr>)}</tbody></table>
      )}
    </Panel>
  );
}
