import { Link } from "@tanstack/react-router";
import logo from "@/assets/pennygrade-logo.jpg.asset.json";
import { cn } from "@/lib/utils";

export const LOGO_URL = logo.url;

/** Official PennyGrade logo, shown as supplied (framed, never redrawn). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-block overflow-hidden rounded-lg bg-navy ring-1 ring-gold/25", className)}>
      <img src={logo.url} alt="PennyGrade logo" className="h-full w-full object-cover object-[50%_38%] scale-[1.35]" />
    </span>
  );
}

export function Wordmark({ className, to = "/" }: { className?: string; to?: string }) {
  return (
    <Link to={to} className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className="h-9 w-9" />
      <span className="font-display text-lg font-semibold tracking-tight">
        Penny<span className="text-gold">Grade</span>
      </span>
    </Link>
  );
}

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-success/12 text-success ring-success/25",
  AVAILABLE: "bg-secondary text-secondary-foreground ring-border",
  EXPIRED: "bg-muted text-muted-foreground ring-border",
  INACTIVE: "bg-muted text-muted-foreground ring-border",
  SUSPENDED: "bg-warning/15 text-foreground ring-warning/40",
  LOST: "bg-warning/15 text-foreground ring-warning/40",
  CANCELLED: "bg-destructive/10 text-destructive ring-destructive/25",
  VERIFIED: "bg-success/12 text-success ring-success/25",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide ring-1", statusStyles[status] ?? statusStyles.INACTIVE)}>
      {status}
    </span>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed bg-card/60 px-6 py-12 text-center">
      <LogoMark className="mx-auto mb-4 h-10 w-10 opacity-80" />
      <p className="font-medium">{title}</p>
      {children && <div className="mt-3 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}
