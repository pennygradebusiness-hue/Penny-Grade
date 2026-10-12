import { ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  desc,
  actions,
}: {
  title: string;
  desc?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-[#ececf1] pb-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-navy sm:text-3xl">{title}</h1>
        {desc && <p className="mt-1 text-xs font-semibold text-muted-foreground sm:text-sm">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="rounded-[12px] border border-[#ececf1] bg-white p-5 shadow-card transition-all hover:shadow-lift">
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="tabular mt-2 font-display text-2xl font-extrabold text-navy sm:text-3xl">{value}</p>
      {sub && <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function Panel({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[12px] border border-[#ececf1] bg-white p-6 shadow-card", className)}>
      {title && <h2 className="mb-4 font-display text-base font-bold text-navy">{title}</h2>}
      {children}
    </div>
  );
}

export function DataTable({
  head,
  children,
  empty,
}: {
  head: string[];
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-[12px] border border-[#ececf1] bg-white shadow-card">
      <table className="w-full text-xs sm:text-sm">
        <thead className="border-b border-[#ececf1] bg-[#fafafc] text-left text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
          <tr>
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap px-4 py-3.5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#ececf1]">{children}</tbody>
      </table>
      {empty && (
        <div className="py-14 text-center text-xs font-semibold text-muted-foreground">
          No records found in this view.
        </div>
      )}
    </div>
  );
}

export const td = "whitespace-nowrap px-4 py-3.5 font-medium text-navy text-xs sm:text-sm";

export function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-[8px] bg-muted" />
      ))}
    </div>
  );
}

export function Select({
  value,
  onChange,
  children,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-10 rounded-[8px] border border-[#ececf1] bg-white px-3 text-xs font-semibold text-navy shadow-sm focus:border-gold outline-none",
        className
      )}
    >
      {children}
    </select>
  );
}

export function downloadCsv(name: string, rows: (string | number | null | undefined)[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function Chart({ children }: { children: React.ReactElement }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
