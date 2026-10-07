import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, Stat, Panel, TableSkeleton } from "@/components/admin-ui";
import { supabase } from "@/integrations/supabase/client";
import { fetchLogs, groupSum, lastMonths, monthKey } from "@/lib/admin-data";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({ component: Dashboard });

const axis = { fontSize: 11, stroke: "var(--muted-foreground)" };

function Dashboard() {
  const q = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [mem, partners, offers, logs] = await Promise.all([
        supabase.from("memberships").select("id,status,expiry_date,created_at"),
        supabase.from("partners").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
        supabase.from("offers").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
        fetchLogs(180),
      ]);
      const ms = mem.data ?? [];
      const active = ms.filter((m) => m.status === "ACTIVE" && m.expiry_date >= today).length;
      const expired = ms.filter((m) => m.status === "EXPIRED" || (m.status === "ACTIVE" && m.expiry_date < today)).length;
      return { ms, active, expired, partners: partners.count ?? 0, offers: offers.count ?? 0, logs };
    },
  });
  if (q.isLoading || !q.data) return <><PageHeader title="Dashboard" /><TableSkeleton /></>;
  const { ms, logs } = q.data;
  const todayStr = new Date().toDateString();
  const todayCount = logs.filter((l) => new Date(l.created_at).toDateString() === todayStr).length;
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const monthLogs = logs.filter((l) => new Date(l.created_at) >= monthStart);
  const months = lastMonths(6);
  const growth = groupSum(ms, (m) => monthKey(m.created_at));
  let cum = ms.filter((m) => !months.includes(monthKey(m.created_at))).length;
  const growthData = months.map((m) => ({ m, members: (cum += growth.get(m) ?? 0) }));
  const vByMonth = groupSum(logs, (l) => monthKey(l.created_at));
  const vData = months.map((m) => ({ m, count: vByMonth.get(m) ?? 0 }));
  const byPartner = [...groupSum(logs, (l) => l.partner?.business_name ?? "—")].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6);
  const byCat = [...groupSum(logs, (l) => l.partner?.category?.name ?? "Other", (l) => Number(l.discount_amount))].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  return (
    <>
      <PageHeader title="Dashboard" desc="PennyGrade network at a glance" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total Members" value={ms.length} />
        <Stat label="Active Members" value={q.data.active} />
        <Stat label="Expired Members" value={q.data.expired} />
        <Stat label="Active Partners" value={q.data.partners} />
        <Stat label="Active Offers" value={q.data.offers} />
        <Stat label="Today's Verifications" value={todayCount} />
        <Stat label="Monthly Verifications" value={monthLogs.length} />
        <Stat label="Est. Discount Value" value={inr(monthLogs.reduce((s, l) => s + Number(l.discount_amount), 0))} sub="This month" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Membership growth"><Chart><LineChart data={growthData}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="m" {...axis} /><YAxis {...axis} allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="members" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} /></LineChart></Chart></Panel>
        <Panel title="Verification activity"><Chart><BarChart data={vData}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="m" {...axis} /><YAxis {...axis} allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="var(--chart-2)" radius={[6, 6, 0, 0]} /></BarChart></Chart></Panel>
        <Panel title="Partner performance (verifications)"><Chart><BarChart data={byPartner} layout="vertical"><XAxis type="number" {...axis} allowDecimals={false} /><YAxis type="category" dataKey="name" width={110} {...axis} /><Tooltip /><Bar dataKey="count" fill="var(--chart-1)" radius={[0, 6, 6, 0]} /></BarChart></Chart></Panel>
        <Panel title="Category performance (discount value)"><Chart><BarChart data={byCat}><XAxis dataKey="name" {...axis} /><YAxis {...axis} /><Tooltip formatter={(v: number) => inr(v)} /><Bar dataKey="value" fill="var(--chart-3)" radius={[6, 6, 0, 0]} /></BarChart></Chart></Panel>
      </div>
    </>
  );
}

export function Chart({ children }: { children: React.ReactElement }) {
  return <div className="h-60"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>;
}
