import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, DataTable, td, TableSkeleton, Select } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { addAdmin } from "@/lib/admin.functions";
import { logAudit } from "@/lib/use-session";

export const Route = createFileRoute("/_authenticated/admin/admins")({ component: Admins });

const ROLES = ["super_admin", "manager", "membership_manager", "support"] as const;

function Admins() {
  const { roles } = Route.useRouteContext();
  const isSuper = roles.includes("super_admin");
  const qc = useQueryClient();
  const add = useServerFn(addAdmin);
  const q = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: async () => {
      const [{ data: r }, { data: p }] = await Promise.all([supabase.from("user_roles").select("*"), supabase.from("profiles").select("user_id,full_name,email")]);
      const pm = new Map((p ?? []).map((x) => [x.user_id, x]));
      return (r ?? []).map((x) => ({ ...x, profile: pm.get(x.user_id) }));
    },
  });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("manager");
  const grant = async () => {
    try { await add({ data: { email, role } }); toast.success("Role granted"); setEmail(""); qc.invalidateQueries({ queryKey: ["admin", "roles"] }); }
    catch (e) { toast.error((e as Error).message); }
  };
  const revoke = async (id: string, uid: string, r: string) => {
    if (!confirm("Remove this role?")) return;
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) return toast.error("Not permitted");
    await logAudit(`Revoked role ${r}`, "user", uid); qc.invalidateQueries({ queryKey: ["admin", "roles"] });
  };
  return (
    <>
      <PageHeader title="Administrators" desc="Roles: Super Admin (full), Manager (operations), Membership Manager (members & cards), Support (read-only)." />
      {isSuper && (
        <div className="mb-5 flex flex-wrap gap-2 rounded-2xl border bg-card p-4">
          <Input placeholder="Registered user's email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 max-w-xs" />
          <Select value={role} onChange={(v) => setRole(v as typeof role)}>{ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}</Select>
          <Button size="sm" onClick={grant} disabled={!email}>Grant role</Button>
        </div>
      )}
      {q.isLoading ? <TableSkeleton /> : (
        <DataTable head={["Name", "Email", "Role", "Since", ""]} empty={!q.data?.length}>
          {q.data?.map((r) => (
            <tr key={r.id}><td className={`${td} font-medium`}>{r.profile?.full_name}</td><td className={td}>{r.profile?.email}</td><td className={`${td} capitalize`}>{r.role.replace(/_/g, " ")}</td><td className={td}>{r.created_at.slice(0, 10)}</td>
              <td className={td}>{isSuper && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => revoke(r.id, r.user_id, r.role)}>Remove</Button>}</td></tr>
          ))}
        </DataTable>
      )}
    </>
  );
}
