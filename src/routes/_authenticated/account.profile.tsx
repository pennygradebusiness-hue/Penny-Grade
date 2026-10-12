import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AccountLayout, AccountSkeleton } from "@/components/account";
import { StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { myMemberQuery } from "@/lib/member";
import { effectiveStatus, fmtDate, maskId } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/account/profile")({
  head: () => ({ meta: [{ title: "Profile | PennyGrade" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: Profile,
});

const schema = z.object({ full_name: z.string().trim().min(2).max(100), mobile: z.string().trim().regex(/^\+?[0-9 ]{10,15}$/, "Enter a valid mobile number") });

function Profile() {
  const { data, isLoading } = useQuery(myMemberQuery);
  const qc = useQueryClient();
  const [f, setF] = useState({ full_name: "", mobile: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data?.profile) setF({ full_name: data.profile.full_name, mobile: data.profile.mobile ?? "" }); }, [data?.profile]);
  if (isLoading) return <AccountLayout><AccountSkeleton /></AccountLayout>;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = schema.safeParse(f);
    if (!p.success) return toast.error(p.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.from("profiles").update(p.data).eq("user_id", data!.user.id);
    setBusy(false);
    if (error) return toast.error("Could not update profile.");
    toast.success("Profile updated");
    qc.invalidateQueries({ queryKey: ["me"] });
  };
  const m = data?.membership;
  return (
    <AccountLayout>
      <h1 className="mb-6 text-2xl font-semibold">Profile</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <form onSubmit={save} className="space-y-4 rounded-2xl border bg-card p-5">
          <div className="space-y-1.5"><Label>Full name</Label><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Mobile</Label><Input value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input value={data?.user.email ?? ""} disabled /></div>
          <Button disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
        </form>
        <dl className="h-fit divide-y rounded-2xl border bg-card text-sm">
          <R k="Membership" v={(m as { plan?: { name: string } } | null)?.plan?.name ?? "None"} />
          <R k="Membership ID" v={maskId(m?.membership_number)} />
          <div className="flex justify-between px-5 py-3.5"><dt className="text-muted-foreground">Status</dt><dd>{m ? <StatusBadge status={effectiveStatus(m)} /> : "—"}</dd></div>
          <R k="Expiry" v={fmtDate(m?.expiry_date)} />
          <R k="Current card" v={data?.card ? maskId(data.card.card_number) : "Not issued"} />
        </dl>
      </div>
    </AccountLayout>
  );
}
function R({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between px-5 py-3.5"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>;
}
