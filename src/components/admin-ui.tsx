import { cn } from "@/lib/utils";

export function PageHeader({ title, desc, actions }: { title: string; desc?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-2xl font-semibold">{title}</h1>{desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="tabular mt-2 font-display text-2xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function Panel({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border bg-card p-5 shadow-card", className)}>
      {title && <h2 className="mb-4 text-sm font-semibold">{title}</h2>}
      {children}
    </div>
  );
}

export function DataTable({ head, children, empty }: { head: string[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card shadow-card">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>{head.map((h) => <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y">{children}</tbody>
      </table>
      {empty && <p className="py-12 text-center text-sm text-muted-foreground">Nothing here yet.</p>}
    </div>
  );
}

export const td = "whitespace-nowrap px-4 py-3";

export function TableSkeleton() {
  return <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />)}</div>;
}

export function Select({ value, onChange, children, className }: { value: string; onChange: (v: string) => void; children: React.ReactNode; className?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cn("h-9 rounded-md border bg-card px-3 text-sm", className)}>{children}</select>
  );
}

export function downloadCsv(name: string, rows: (string | number | null | undefined)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
