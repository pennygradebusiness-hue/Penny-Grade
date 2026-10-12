import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AccountLayout, MembershipCard, AccountSkeleton } from "@/components/account";
import { EmptyState, StatusBadge } from "@/components/brand";
import { myMemberQuery } from "@/lib/member";
import { effectiveStatus, fmtDate, maskId } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/account/membership")({
  head: () => ({ meta: [{ title: "My Membership | PennyGrade" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: MembershipPage,
});

function MembershipPage() {
  const { data, isLoading } = useQuery(myMemberQuery);
  const [reveal, setReveal] = useState(false);
  if (isLoading) return <AccountLayout><AccountSkeleton /></AccountLayout>;
  const m = data?.membership;
  return (
    <AccountLayout>
      <h1 className="mb-6 text-2xl font-semibold">My Membership</h1>
      {!m ? <EmptyState title="You don't currently have an active PennyGrade membership." >Contact support@pennygrade.com to activate.</EmptyState> : (
        <div className="grid gap-6 md:grid-cols-2">
          <MembershipCard name={data?.profile?.full_name ?? ""} membership={m} reveal={reveal} />
          <dl className="divide-y rounded-2xl border bg-card text-sm">
            <Row k="Plan" v={(m as { plan?: { name: string } }).plan?.name ?? "—"} />
            <div className="flex items-center justify-between px-5 py-3.5"><dt className="text-muted-foreground">Membership ID</dt>
              <dd className="flex items-center gap-2 font-mono">{reveal ? m.membership_number : maskId(m.membership_number)}
                <button onClick={() => setReveal(!reveal)} aria-label="Toggle ID">{reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></dd></div>
            <div className="flex items-center justify-between px-5 py-3.5"><dt className="text-muted-foreground">Status</dt><dd><StatusBadge status={effectiveStatus(m)} /></dd></div>
            <Row k="Start date" v={fmtDate(m.start_date)} />
            <Row k="Valid until" v={fmtDate(m.expiry_date)} />
            <Row k="Physical card" v={data?.card ? maskId(data.card.card_number) : "Not issued yet"} />
          </dl>
        </div>
      )}
    </AccountLayout>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between px-5 py-3.5"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>;
}
