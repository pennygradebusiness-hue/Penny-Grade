import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, Stat, Panel, TableSkeleton, Chart } from "@/components/admin-ui";
import { getAdminMembers, getAdminCards, getAdminPartners, getAdminOffers } from "@/lib/admin.functions";
import { fetchLogs, groupSum, lastMonths, monthKey } from "@/lib/admin-data";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  ssr: false,
  component: Dashboard,
});

const axis = { fontSize: 11, stroke: "var(--muted-foreground)" };

function Dashboard() {
  const fetchMembersFn = useServerFn(getAdminMembers);
  const fetchCardsFn = useServerFn(getAdminCards);
  const fetchPartnersFn = useServerFn(getAdminPartners);
  const fetchOffersFn = useServerFn(getAdminOffers);

  const q = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      try {
        const [msRes, cardsRes, partnersRes, offersRes, logsRes] = await Promise.allSettled([
          fetchMembersFn(),
          fetchCardsFn(),
          fetchPartnersFn(),
          fetchOffersFn(),
          fetchLogs(180),
        ]);

        const errors: string[] = [];
        if (msRes.status === "rejected") {
          console.error("fetchMembersFn failed:", msRes.reason);
          errors.push("Members");
        }
        if (cardsRes.status === "rejected") {
          console.error("fetchCardsFn failed:", cardsRes.reason);
          errors.push("Cards");
        }
        if (partnersRes.status === "rejected") {
          console.error("fetchPartnersFn failed:", partnersRes.reason);
          errors.push("Partners");
        }
        if (offersRes.status === "rejected") {
          console.error("fetchOffersFn failed:", offersRes.reason);
          errors.push("Offers");
        }
        if (logsRes.status === "rejected") {
          console.error("fetchLogs failed:", logsRes.reason);
          errors.push("Verification Logs");
        }

        const ms = msRes.status === "fulfilled" ? (msRes.value ?? []) : [];
        const cards = cardsRes.status === "fulfilled" ? (cardsRes.value ?? []) : [];
        const partners = partnersRes.status === "fulfilled" ? (partnersRes.value ?? []) : [];
        const offers = offersRes.status === "fulfilled" ? (offersRes.value ?? []) : [];
        const logs = logsRes.status === "fulfilled" ? (logsRes.value ?? []) : [];

        const active = ms.filter((m) => m.status === "ACTIVE" && Boolean(m.expiry_date && m.expiry_date >= today)).length;
        const expired = ms.filter((m) => m.status === "EXPIRED" || (m.status === "ACTIVE" && (!m.expiry_date || m.expiry_date < today))).length;
        const availableCards = cards.filter((c) => c.status === "AVAILABLE").length;
        const activePartners = partners.filter((p) => p.status === "ACTIVE").length;
        const activeOffers = offers.filter((o) => o.status === "ACTIVE").length;

        return {
          ms,
          cards,
          active,
          expired,
          availableCards,
          partners: activePartners,
          offers: activeOffers,
          logs,
          errors,
        };
      } catch (err) {
        console.error("Dashboard error:", err);
        return {
          ms: [],
          cards: [],
          active: 0,
          expired: 0,
          availableCards: 0,
          partners: 0,
          offers: 0,
          logs: [],
          errors: ["All dashboard services"],
        };
      }
    },
  });

  if (q.isLoading || !q.data) return <><PageHeader title="Dashboard" /><TableSkeleton /></>;

  const { ms, logs, availableCards, errors = [] } = q.data;
  const todayStr = new Date().toDateString();
  const todayCount = logs.filter((l) => new Date(l.created_at).toDateString() === todayStr).length;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthLogs = logs.filter((l) => new Date(l.created_at) >= monthStart);
  const months = lastMonths(6);
  const growth = groupSum(ms, (m) => monthKey(m.created_at ?? ""));
  let cum = ms.filter((m) => !months.includes(monthKey(m.created_at ?? ""))).length;
  const growthData = months.map((m) => ({ m, members: (cum += growth.get(m) ?? 0) }));
  const vByMonth = groupSum(logs, (l) => monthKey(l.created_at));
  const vData = months.map((m) => ({ m, count: vByMonth.get(m) ?? 0 }));
  const byPartner = [...groupSum(logs, (l) => l.partner?.business_name ?? "—")].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6);
  const byCat = [...groupSum(logs, (l) => l.partner?.category?.name ?? "Other", (l) => Number(l.discount_amount))].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  return (
    <>
      <PageHeader title="Dashboard" desc="PennyGrade network at a glance" />
      {errors.length > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-900">
          <span>⚠️ Live statistics could not be updated for: {errors.join(", ")}. Please check service connection.</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Total Members" value={ms.length} />
        <Stat label="Active Members" value={q.data.active} />
        <Stat label="Expired Members" value={q.data.expired} />
        <Stat label="Available Cards" value={availableCards} />
        <Stat label="Active Partners" value={q.data.partners} />
        <Stat label="Active Offers" value={q.data.offers} />
        <Stat label="Today's Verifications" value={todayCount} />
        <Stat label="Monthly Verifications" value={monthLogs.length} />
        <Stat label="Est. Discount Value" value={inr(monthLogs.reduce((s, l) => s + Number(l.discount_amount), 0))} sub="This month" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Membership growth">
          <Chart>
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="m" {...axis} />
              <YAxis {...axis} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="members" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </Chart>
        </Panel>
        <Panel title="Verification activity">
          <Chart>
            <BarChart data={vData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="m" {...axis} />
              <YAxis {...axis} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </Chart>
        </Panel>
        <Panel title="Partner performance (verifications)">
          <Chart>
            <BarChart data={byPartner} layout="vertical">
              <XAxis type="number" {...axis} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={110} {...axis} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </Chart>
        </Panel>
        <Panel title="Category performance (discount value)">
          <Chart>
            <BarChart data={byCat}>
              <XAxis dataKey="name" {...axis} />
              <YAxis {...axis} />
              <Tooltip formatter={(v: number) => inr(v)} />
              <Bar dataKey="value" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </Chart>
        </Panel>
      </div>
    </>
  );
}
