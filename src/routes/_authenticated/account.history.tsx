import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AccountLayout, HistoryList } from "@/components/account";
import { myHistoryQuery } from "@/lib/member";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/account/history")({
  head: () => ({ meta: [{ title: "Verification History | PennyGrade" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: History,
});

function History() {
  const { data, isLoading } = useQuery(myHistoryQuery(200));
  const total = (data ?? []).reduce((s, r) => s + Number(r.discount_amount), 0);
  return (
    <AccountLayout>
      <div className="mb-6 flex items-end justify-between">
        <h1 className="text-2xl font-semibold">Verification History</h1>
        {total > 0 && <p className="text-sm text-muted-foreground">Total saved <span className="font-semibold text-success">{inr(total)}</span></p>}
      </div>
      {isLoading ? <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div> : <HistoryList rows={(data ?? []) as never} />}
    </AccountLayout>
  );
}
