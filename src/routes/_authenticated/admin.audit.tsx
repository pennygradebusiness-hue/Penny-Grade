import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, DataTable, td, TableSkeleton } from "@/components/admin-ui";
import { getAdminAuditLogs } from "@/lib/admin.functions";
import { fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/audit")({ component: Audit });

function Audit() {
  const q = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: async () => {
      return await getAdminAuditLogs();
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
