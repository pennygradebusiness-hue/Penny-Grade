import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, DataTable, td, TableSkeleton } from "@/components/admin-ui";
import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/audit")({ component: Audit });

function Audit() {
  const q = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: async () => {
      const [{ data: a }, { data: p }] = await Promise.all([
        supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("profiles").select("user_id,full_name,email"),
      ]);
      const pm = new Map((p ?? []).map((x) => [x.user_id, x.full_name || x.email]));
      return (a ?? []).map((x) => ({ ...x, who: pm.get(x.admin_user_id) ?? "—" }));
    },
  });
  return (
    <>
      <PageHeader title="Audit Logs" desc="Important admin actions (visible to Super Admins and Managers)" />
      {q.isLoading ? <TableSkeleton /> : (
        <DataTable head={["When", "Admin", "Action", "Target", "Details"]} empty={!q.data?.length}>
          {q.data?.map((a) => (
            <tr key={a.id}><td className={td}>{fmtDateTime(a.created_at)}</td><td className={td}>{a.who}</td><td className={`${td} font-medium`}>{a.action}</td>
              <td className={`${td} text-xs text-muted-foreground`}>{a.target_type}</td>
              <td className="max-w-md truncate px-4 py-3 font-mono text-xs text-muted-foreground">{JSON.stringify(a.metadata)}</td></tr>
          ))}
        </DataTable>
      )}
    </>
  );
}
