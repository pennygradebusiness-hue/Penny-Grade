import { getAdminVerificationLogs } from "@/lib/admin.functions";

export async function fetchLogs(sinceDays = 365) {
  return getAdminVerificationLogs({ data: { sinceDays } });
}

export function monthKey(d: string) {
  const x = new Date(d);
  return x.toLocaleString("en-IN", { month: "short", year: "2-digit" });
}

export function lastMonths(n: number) {
  const out: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setMonth(d.getMonth() - i);
    out.push(monthKey(x.toISOString()));
  }
  return out;
}

export function groupSum<T>(rows: T[], key: (r: T) => string, val: (r: T) => number = () => 1) {
  const m = new Map<string, number>();
  rows.forEach((r) => m.set(key(r), (m.get(key(r)) ?? 0) + val(r)));
  return m;
}
