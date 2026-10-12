import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, Panel, Stat, TableSkeleton, Chart, Select, downloadCsv } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fetchLogs, groupSum, lastMonths, monthKey } from "@/lib/admin-data";
import { inr, maskId } from "@/lib/format";
import { Building2, Calendar, TrendingUp, Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/reports")({ component: Reports });
const axis = { fontSize: 11, stroke: "var(--muted-foreground)" };

function Reports() {
  const q = useQuery({ queryKey: ["admin", "reports"], queryFn: () => fetchLogs(365) });
  const profs = useQuery({
    queryKey: ["admin", "profiles-min"],
    queryFn: async () => (await supabase.from("profiles").select("user_id,full_name")).data ?? [],
  });

  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [selectedPartnerFilter, setSelectedPartnerFilter] = useState<string>("ALL");

  const logs = q.data ?? [];
  const pm = new Map((profs.data ?? []).map((p) => [p.user_id, p.full_name]));
  const totalDiscount = logs.reduce((s, l) => s + Number(l.discount_amount), 0);
  const billTotal = logs.reduce((s, l) => s + Number(l.bill_amount), 0);
  const months = lastMonths(12);
  const mc = groupSum(logs, (l) => monthKey(l.created_at));
  const mv = groupSum(logs, (l) => monthKey(l.created_at), (l) => Number(l.discount_amount));
  const trend = months.map((m) => ({ m, count: mc.get(m) ?? 0, value: mv.get(m) ?? 0 }));

  // Aggregate by Partner
  const partnerMap = new Map<
    string,
    {
      name: string;
      category: string;
      redemptions: number;
      uniqueMembers: Set<string>;
      totalBill: number;
      totalDiscount: number;
    }
  >();

  logs.forEach((l) => {
    const name = l.partner?.business_name || "Unknown Business";
    const cat = l.partner?.category?.name || "General";
    if (!partnerMap.has(name)) {
      partnerMap.set(name, {
        name,
        category: cat,
        redemptions: 0,
        uniqueMembers: new Set(),
        totalBill: 0,
        totalDiscount: 0,
      });
    }
    const entry = partnerMap.get(name)!;
    entry.redemptions += 1;
    if (l.user_id) entry.uniqueMembers.add(l.user_id);
    entry.totalBill += Number(l.bill_amount) || 0;
    entry.totalDiscount += Number(l.discount_amount) || 0;
  });

  const rankedPartners = Array.from(partnerMap.values()).sort(
    (a, b) => b.redemptions - a.redemptions
  );

  // Monthly breakdown by Partner (hooks defined unconditionally)
  const monthlyPartnerRows = useMemo(() => {
    type MonthlyRow = {
      month: string;
      partner: string;
      redemptions: number;
      billTotal: number;
      discountTotal: number;
      uniqueCustomers: number;
    };

    const map = new Map<string, { month: string; partner: string; redemptions: number; bill: number; discount: number; members: Set<string> }>();

    logs.forEach((l) => {
      const m = monthKey(l.created_at);
      const p = l.partner?.business_name || "Unknown Partner";
      const key = `${m}__${p}`;

      if (!map.has(key)) {
        map.set(key, {
          month: m,
          partner: p,
          redemptions: 0,
          bill: 0,
          discount: 0,
          members: new Set(),
        });
      }

      const rec = map.get(key)!;
      rec.redemptions += 1;
      rec.bill += Number(l.bill_amount) || 0;
      rec.discount += Number(l.discount_amount) || 0;
      if (l.user_id) rec.members.add(l.user_id);
    });

    return Array.from(map.values())
      .map((r): MonthlyRow => ({
        month: r.month,
        partner: r.partner,
        redemptions: r.redemptions,
        billTotal: r.bill,
        discountTotal: r.discount,
        uniqueCustomers: r.members.size,
      }))
      .filter((r) => {
        if (selectedMonth !== "ALL" && r.month !== selectedMonth) return false;
        if (selectedPartnerFilter !== "ALL" && r.partner !== selectedPartnerFilter) return false;
        return true;
      })
      .sort((a, b) => b.redemptions - a.redemptions);
  }, [logs, selectedMonth, selectedPartnerFilter]);

  const availableMonths = useMemo(() => {
    return Array.from(new Set(logs.map((l) => monthKey(l.created_at))));
  }, [logs]);

  const availablePartners = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.partner?.business_name || "Unknown Business")));
  }, [logs]);

  if (q.isLoading) {
    return (
      <>
        <PageHeader title="Reports" desc="Loading analytics data…" />
        <TableSkeleton />
      </>
    );
  }

  // Categories & Member ranking
  const table = (m: Map<string, number>, v?: Map<string, number>) =>
    [...m].map(([k, c]) => ({ k, c, v: v?.get(k) ?? 0 })).sort((a, b) => b.c - a.c);
  const cats = table(
    groupSum(logs, (l) => l.partner?.category?.name ?? "Other"),
    groupSum(logs, (l) => l.partner?.category?.name ?? "Other", (l) => Number(l.discount_amount))
  );
  const memberKey = (l: (typeof logs)[number]) =>
    `${pm.get(l.user_id) || "Member"} · ${maskId(l.membership?.membership_number)}`;
  const members = table(
    groupSum(logs, memberKey),
    groupSum(logs, memberKey, (l) => Number(l.discount_amount))
  ).slice(0, 10);

  const handleExportCsv = () => {
    const rows = [
      ["Business Name", "Month", "Redemptions", "Unique Customers", "Total Bill", "Discount Saved"],
      ...monthlyPartnerRows.map((r) => [
        r.partner,
        r.month,
        r.redemptions,
        r.uniqueCustomers,
        r.billTotal,
        r.discountTotal,
      ]),
    ];
    downloadCsv("monthly_business_redemptions.csv", rows);
  };

  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        desc="Real-time redemption performance, business leaderboards, and monthly breakdown"
        actions={
          <Button size="sm" variant="outline" onClick={handleExportCsv}>
            Export Monthly Report
          </Button>
        }
      />

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total Redemptions" value={logs.length} sub="All verified visits" />
        <Stat label="Total Discount Given" value={inr(totalDiscount)} sub="Direct customer savings" />
        <Stat label="Customer Spend" value={inr(billTotal)} sub="Generated at partner outlets" />
        <Stat
          label="Active Redeeming Members"
          value={new Set(logs.map((l) => l.user_id)).size}
          sub="Unique members visited"
        />
      </div>

      {/* Charts: Monthly Trend */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Monthly Verification Volume">
          <Chart>
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="m" {...axis} />
              <YAxis {...axis} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--chart-1)" radius={[6, 6, 0, 0]} name="Verifications" />
            </BarChart>
          </Chart>
        </Panel>
        <Panel title="Estimated Discount Value Trend (₹)">
          <Chart>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="m" {...axis} />
              <YAxis {...axis} />
              <Tooltip formatter={(v: number) => inr(v)} />
              <Line dataKey="value" stroke="var(--chart-2)" strokeWidth={2.5} dot={false} name="Discount ₹" />
            </LineChart>
          </Chart>
        </Panel>
      </div>

      {/* Business Redemption Leaderboard (Most Redeemed Businesses) */}
      <div className="mt-6">
        <Panel
          title="Business Performance Leaderboard · Most Redeemed Businesses"
          className="overflow-hidden"
        >
          <p className="mb-4 text-xs font-semibold text-muted-foreground">
            Ranked by customer verification volume and total business generated.
          </p>
          {!rankedPartners.length ? (
            <p className="text-sm text-muted-foreground">No partner redemptions recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="border-b border-[#ececf1] bg-[#fafafc] text-left text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-3 px-3">Rank</th>
                    <th className="py-3 px-3">Business Name</th>
                    <th className="py-3 px-3 text-right">Redemptions</th>
                    <th className="py-3 px-3 text-right">Unique Customers</th>
                    <th className="py-3 px-3 text-right">Customer Spend</th>
                    <th className="py-3 px-3 text-right">Discount Saved</th>
                    <th className="py-3 px-3 text-right">Share of Visits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ececf1]">
                  {rankedPartners.map((p, idx) => {
                    const sharePct = logs.length > 0 ? Math.round((p.redemptions / logs.length) * 100) : 0;
                    return (
                      <tr key={p.name} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
                              idx === 0
                                ? "bg-amber-400 text-amber-950 font-black shadow-xs"
                                : idx === 1
                                ? "bg-slate-200 text-slate-800"
                                : idx === 2
                                ? "bg-amber-100 text-amber-800"
                                : "text-muted-foreground font-semibold"
                            }`}
                          >
                            #{idx + 1}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-navy flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-gold shrink-0" />
                            <span>{p.name}</span>
                          </div>
                          <span className="text-[10px] font-semibold text-muted-foreground">{p.category}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold tabular text-navy">
                          {p.redemptions}
                        </td>
                        <td className="py-3 px-3 text-right tabular text-muted-foreground">
                          {p.uniqueMembers.size}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold tabular text-navy">
                          {inr(p.totalBill)}
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold tabular text-emerald-600">
                          {inr(p.totalDiscount)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <span className="text-xs font-bold text-navy">{sharePct}%</span>
                            <div className="h-1.5 w-12 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full bg-amber-500 rounded-full"
                                style={{ width: `${Math.min(100, sharePct)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {/* Monthly Reports Breakdown by Business */}
      <div className="mt-6">
        <Panel title="Monthly Business Redemption Reports">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold text-muted-foreground">
              Month-by-month breakdown of how many redemptions and discounts each business received.
            </p>
            <div className="flex flex-wrap gap-2">
              <Select value={selectedMonth} onChange={setSelectedMonth}>
                <option value="ALL">All Months ({availableMonths.length})</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
              <Select value={selectedPartnerFilter} onChange={setSelectedPartnerFilter}>
                <option value="ALL">All Businesses ({availablePartners.length})</option>
                {availablePartners.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {!monthlyPartnerRows.length ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No monthly redemption records found for this filter.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="border-b border-[#ececf1] bg-[#fafafc] text-left text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-3 px-3">Month</th>
                    <th className="py-3 px-3">Business Name</th>
                    <th className="py-3 px-3 text-right">Redemptions</th>
                    <th className="py-3 px-3 text-right">Unique Customers</th>
                    <th className="py-3 px-3 text-right">Total Bill Amount</th>
                    <th className="py-3 px-3 text-right">Total Discount Saved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ececf1]">
                  {monthlyPartnerRows.map((r, i) => (
                    <tr key={`${r.month}-${r.partner}-${i}`} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-semibold text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-gold" />
                          {r.month}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-navy">{r.partner}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold tabular text-navy">
                        {r.redemptions}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular text-muted-foreground">
                        {r.uniqueCustomers}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold tabular text-navy">
                        {inr(r.billTotal)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-extrabold tabular text-emerald-600">
                        {inr(r.discountTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {/* Categories & Most Active Members */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <RankTable title="Category Performance" rows={cats} />
        <RankTable title="Most-Active Members" rows={members} />
      </div>
    </>
  );
}

function RankTable({ title, rows }: { title: string; rows: { k: string; c: number; v: number }[] }) {
  return (
    <Panel title={title}>
      {!rows.length ? (
        <p className="text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground border-b border-[#ececf1]">
            <tr>
              <th className="pb-2">Name</th>
              <th className="pb-2 text-right">Verifications</th>
              <th className="pb-2 text-right">Discount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ececf1]">
            {rows.map((r) => (
              <tr key={r.k}>
                <td className="py-2.5 font-medium text-navy">{r.k}</td>
                <td className="tabular py-2.5 text-right font-bold text-navy">{r.c}</td>
                <td className="tabular py-2.5 text-right font-bold text-emerald-600">{inr(r.v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
