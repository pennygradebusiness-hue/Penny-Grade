import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Plus } from "lucide-react";
import { PageHeader, DataTable, td, TableSkeleton, Select, downloadCsv } from "@/components/admin-ui";
import { StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { createMember } from "@/lib/admin.functions";
import { logAudit } from "@/lib/use-session";
import { effectiveStatus, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/members")({ component: Members });

const PAGE = 20;
type Row = {
  id: string; membership_number: string; start_date: string; expiry_date: string; status: string; plan_id: string; user_id: string;
  plan: { name: string; duration_days: number } | null;
  cards: { id: string; card_number: string; status: string }[];
  profile?: { full_name: string; mobile: string | null; email: string | null };
};

function Members() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin", "members"],
    queryFn: async () => {
      const [{ data: ms }, { data: profs }] = await Promise.all([
        supabase.from("memberships").select("id,membership_number,start_date,expiry_date,status,plan_id,user_id,plan:membership_plans(name,duration_days),cards:physical_cards(id,card_number,status)").order("created_at", { ascending: false }),
        supabase.from("profiles").select("user_id,full_name,mobile,email"),
      ]);
      const pm = new Map((profs ?? []).map((p) => [p.user_id, p]));
      return ((ms ?? []) as unknown as Row[]).map((m) => ({ ...m, profile: pm.get(m.user_id) }));
    },
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("new");
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const [cardFor, setCardFor] = useState<Row | null>(null);
  const [view, setView] = useState<Row | null>(null);

  const rows = useMemo(() => {
    let r = (q.data ?? []).filter((m) => {
      if (status && effectiveStatus(m) !== status) return false;
      const s = search.toLowerCase();
      return !s || `${m.profile?.full_name} ${m.profile?.email} ${m.profile?.mobile} ${m.membership_number}`.toLowerCase().includes(s);
    });
    if (sort === "name") r = [...r].sort((a, b) => (a.profile?.full_name ?? "").localeCompare(b.profile?.full_name ?? ""));
    if (sort === "expiry") r = [...r].sort((a, b) => a.expiry_date.localeCompare(b.expiry_date));
    return r;
  }, [q.data, search, status, sort]);
  const paged = rows.slice(page * PAGE, page * PAGE + PAGE);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });

  const setMStatus = async (m: Row, s: "ACTIVE" | "SUSPENDED" | "CANCELLED") => {
    const { error } = await supabase.from("memberships").update({ status: s }).eq("id", m.id);
    if (error) return toast.error("Not permitted");
    await logAudit(`${s === "ACTIVE" ? "Activated" : s === "SUSPENDED" ? "Suspended" : "Cancelled"} membership`, "membership", m.id, { membership_number: m.membership_number });
    toast.success(`Membership ${s.toLowerCase()}`); refresh();
  };
  const renew = async (m: Row) => {
    const base = new Date(Math.max(Date.now(), new Date(m.expiry_date).getTime()));
    base.setDate(base.getDate() + (m.plan?.duration_days ?? 365));
    const expiry = base.toISOString().slice(0, 10);
    const { error } = await supabase.from("memberships").update({ status: "ACTIVE", expiry_date: expiry }).eq("id", m.id);
    if (error) return toast.error("Not permitted");
    await logAudit("Renewed membership", "membership", m.id, { new_expiry: expiry });
    toast.success(`Renewed until ${fmtDate(expiry)}`); refresh();
  };

  return (
    <>
      <PageHeader title="Members" desc={`${rows.length} memberships`} actions={<>
        <Button variant="outline" size="sm" onClick={() => downloadCsv("members.csv", [["Name", "Mobile", "Email", "Membership ID", "Plan", "Start", "Expiry", "Status", "Card"], ...rows.map((m) => [m.profile?.full_name, m.profile?.mobile, m.profile?.email, m.membership_number, m.plan?.name, m.start_date, m.expiry_date, effectiveStatus(m), m.cards.find((c) => c.status === "ACTIVE")?.card_number])])}>Export</Button>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Create member</Button></>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input placeholder="Search name, email, mobile, ID" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="h-9 max-w-xs bg-card" />
        <Select value={status} onChange={(v) => { setStatus(v); setPage(0); }}><option value="">All statuses</option>{["ACTIVE", "EXPIRED", "SUSPENDED", "CANCELLED"].map((s) => <option key={s}>{s}</option>)}</Select>
        <Select value={sort} onChange={setSort}><option value="new">Newest</option><option value="name">Name</option><option value="expiry">Expiry soonest</option></Select>
      </div>
      {q.isLoading ? <TableSkeleton /> : (
        <DataTable head={["Name", "Mobile", "Email", "Membership ID", "Plan", "Start", "Expiry", "Status", "Card", ""]} empty={!paged.length}>
          {paged.map((m) => {
            const card = m.cards.find((c) => c.status === "ACTIVE");
            const st = effectiveStatus(m);
            return (
              <tr key={m.id} className="hover:bg-muted/40">
                <td className={`${td} font-medium`}>{m.profile?.full_name || "—"}</td>
                <td className={td}>{m.profile?.mobile}</td>
                <td className={td}>{m.profile?.email}</td>
                <td className={`${td} font-mono text-xs`}>{m.membership_number}</td>
                <td className={td}>{m.plan?.name}</td>
                <td className={td}>{m.start_date}</td>
                <td className={td}>{m.expiry_date}</td>
                <td className={td}><StatusBadge status={st} /></td>
                <td className={`${td} font-mono text-xs`}>{card?.card_number ?? "—"}</td>
                <td className={td}>
                  <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setView(m)}>View</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setCardFor(m)}>{card ? "Replace card" : "Assign card"}</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => renew(m)}>Renew</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {m.status !== "ACTIVE" && <DropdownMenuItem onClick={() => setMStatus(m, "ACTIVE")}>Activate</DropdownMenuItem>}
                      {m.status === "ACTIVE" && <DropdownMenuItem onClick={() => setMStatus(m, "SUSPENDED")}>Suspend</DropdownMenuItem>}
                      {m.status !== "CANCELLED" && <DropdownMenuItem className="text-destructive" onClick={() => confirm("Cancel this membership?") && setMStatus(m, "CANCELLED")}>Cancel</DropdownMenuItem>}
                    </DropdownMenuContent></DropdownMenu>
                </td>
              </tr>
            );
          })}
        </DataTable>
      )}
      {rows.length > PAGE && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          <span className="text-muted-foreground">Page {page + 1} of {Math.ceil(rows.length / PAGE)}</span>
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</Button>
          <Button size="sm" variant="outline" disabled={(page + 1) * PAGE >= rows.length} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
      <CreateMemberDialog open={creating} onClose={() => setCreating(false)} onDone={refresh} />
      <CardDialog member={cardFor} onClose={() => setCardFor(null)} onDone={refresh} />
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent><DialogHeader><DialogTitle>{view?.profile?.full_name}</DialogTitle></DialogHeader>
          {view && <dl className="grid grid-cols-2 gap-3 text-sm">
            {[["Email", view.profile?.email], ["Mobile", view.profile?.mobile], ["Membership ID", view.membership_number], ["Plan", view.plan?.name], ["Start", fmtDate(view.start_date)], ["Expiry", fmtDate(view.expiry_date)], ["Status", effectiveStatus(view)], ["Cards", view.cards.map((c) => `${c.card_number} (${c.status})`).join(", ") || "—"]].map(([k, v]) => (
              <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-medium break-all">{v}</dd></div>))}
          </dl>}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CreateMemberDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const create = useServerFn(createMember);
  const plans = useQuery({ queryKey: ["admin", "plans"], queryFn: async () => (await supabase.from("membership_plans").select("*").order("created_at")).data ?? [] });
  const cards = useQuery({ queryKey: ["admin", "available-cards"], enabled: open, queryFn: async () => (await supabase.from("physical_cards").select("id,card_number").eq("status", "AVAILABLE").order("created_at").limit(200)).data ?? [] });
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ full_name: "", mobile: "", email: "", password: "", plan_id: "", start_date: today, expiry_date: "", card_id: "" });
  const [busy, setBusy] = useState(false);
  const plan = plans.data?.find((p) => p.id === (f.plan_id || plans.data?.[0]?.id));
  const autoExpiry = (start: string, days = plan?.duration_days ?? 365) => { const d = new Date(start); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await create({ data: { ...f, plan_id: f.plan_id || plan!.id, expiry_date: f.expiry_date || autoExpiry(f.start_date) } });
      toast.success(`Member created · ${r.membership_number}`);
      onDone(); onClose();
      setF({ full_name: "", mobile: "", email: "", password: "", plan_id: "", start_date: today, expiry_date: "", card_id: "" });
    } catch (err) { toast.error((err as Error).message || "Could not create member"); }
    setBusy(false);
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create member</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <F label="Full name"><Input required value={f.full_name} onChange={set("full_name")} /></F>
          <F label="Mobile"><Input required value={f.mobile} onChange={set("mobile")} /></F>
          <F label="Email"><Input required type="email" value={f.email} onChange={set("email")} /></F>
          <F label="Temporary password"><Input type="text" value={f.password} onChange={set("password")} placeholder="Only for new accounts" /></F>
          <F label="Plan"><Select className="w-full" value={f.plan_id || plan?.id || ""} onChange={(v) => setF({ ...f, plan_id: v })}>{plans.data?.map((p) => <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>)}</Select></F>
          <F label="Assign physical card"><Select className="w-full" value={f.card_id} onChange={(v) => setF({ ...f, card_id: v })}><option value="">No card yet</option>{cards.data?.map((c) => <option key={c.id} value={c.id}>{c.card_number}</option>)}</Select></F>
          <F label="Start date"><Input type="date" value={f.start_date} onChange={set("start_date")} /></F>
          <F label="Expiry date"><Input type="date" value={f.expiry_date || autoExpiry(f.start_date)} onChange={set("expiry_date")} /></F>
          <p className="text-xs text-muted-foreground sm:col-span-2">A secure random membership ID is generated automatically. Existing accounts (same email) get the membership attached.</p>
          <Button className="sm:col-span-2" disabled={busy}>{busy ? "Creating…" : "Create member"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CardDialog({ member, onClose, onDone }: { member: Row | null; onClose: () => void; onDone: () => void }) {
  const cards = useQuery({ queryKey: ["admin", "available-cards"], enabled: !!member, queryFn: async () => (await supabase.from("physical_cards").select("id,card_number").eq("status", "AVAILABLE").order("created_at").limit(200)).data ?? [] });
  const [cardId, setCardId] = useState("");
  const [oldStatus, setOldStatus] = useState<"LOST" | "CANCELLED">("LOST");
  if (!member) return null;
  const current = member.cards.find((c) => c.status === "ACTIVE");
  const go = async () => {
    if (!cardId) return toast.error("Choose a card");
    if (current) {
      const { error } = await supabase.from("physical_cards").update({ status: oldStatus }).eq("id", current.id);
      if (error) return toast.error("Not permitted");
    }
    const { error } = await supabase.from("physical_cards").update({ membership_id: member.id, status: "ACTIVE", issued_at: new Date().toISOString() }).eq("id", cardId).eq("status", "AVAILABLE");
    if (error) return toast.error("Could not assign card");
    await logAudit(current ? "Replaced card" : "Assigned card", "membership", member.id, { old: current?.card_number, new: cards.data?.find((c) => c.id === cardId)?.card_number });
    toast.success(current ? "Card replaced" : "Card assigned");
    setCardId(""); onDone(); onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{current ? "Replace card" : "Assign card"}</DialogTitle></DialogHeader>
        <div className="space-y-4 text-sm">
          <p>Member: <strong>{member.profile?.full_name}</strong> · {member.membership_number}</p>
          {current && <F label={`Current card ${current.card_number} becomes`}><Select className="w-full" value={oldStatus} onChange={(v) => setOldStatus(v as "LOST")}><option>LOST</option><option>CANCELLED</option></Select></F>}
          <F label="New card"><Select className="w-full" value={cardId} onChange={setCardId}><option value="">Select available card</option>{cards.data?.map((c) => <option key={c.id} value={c.id}>{c.card_number}</option>)}</Select></F>
          {!cards.data?.length && <p className="text-muted-foreground">No available cards. Generate a batch under Physical Cards.</p>}
          <Button className="w-full" onClick={go}>Confirm</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
