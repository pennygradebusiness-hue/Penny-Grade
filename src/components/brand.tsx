import { Link } from "@tanstack/react-router";
import emblemUrl from "@/assets/pennygrade-emblem.png";
import cardUrl from "@/assets/pennygrade-card.jpg";
import { cn } from "@/lib/utils";

export const LOGO_URL = emblemUrl;
export const EMBLEM_URL = emblemUrl;
export const CARD_URL = cardUrl;

/** Official PennyGrade eagle emblem */
export function LogoMark({ className, variant = "badge" }: { className?: string; variant?: "badge" | "raw" }) {
  if (variant === "raw") {
    return <img src={emblemUrl} alt="PennyGrade Eagle Emblem" className={cn("object-contain filter drop-shadow-sm", className)} />;
  }
  return (
    <span className={cn("inline-flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-slate-950 to-black p-1 ring-1 ring-amber-400/50 shadow-sm", className)}>
      <img src={emblemUrl} alt="PennyGrade Eagle Emblem" className="h-full w-full object-contain filter drop-shadow" />
    </span>
  );
}

export function Wordmark({
  className,
  to = "/",
  invert,
}: {
  className?: string;
  to?: string;
  invert?: boolean;
}) {
  const isWhite = invert || className?.includes("text-white");
  return (
    <Link to={to} className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className="h-9 w-9" />
      <span
        className={cn(
          "font-display text-lg font-bold tracking-tight",
          isWhite ? "text-white" : "text-slate-900"
        )}
        style={isWhite ? { color: "#ffffff" } : undefined}
      >
        Penny<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-500 font-extrabold">Grade</span>
      </span>
    </Link>
  );
}

/** Official PennyGrade 3D Luxury Physical Membership Card */
export function PhysicalCardPreview({
  className,
  code = "PEN-7X4P-92LM",
  interactive = true,
}: {
  className?: string;
  code?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl shadow-2xl transition-all duration-300 ring-1 ring-amber-400/20",
        interactive && "hover:scale-[1.02] hover:shadow-amber-500/25 hover:ring-amber-400/50",
        className
      )}
    >
      <img
        src={cardUrl}
        alt="PennyGrade Physical Membership Card"
        className="h-auto w-full rounded-2xl object-cover select-none"
      />
      {code && code !== "PEN-7X4P-92LM" && (
        <div className="absolute bottom-[11%] left-[8%] rounded bg-slate-950/85 px-2.5 py-1 font-mono text-xs font-extrabold tracking-wider text-amber-200 border border-amber-400/40 backdrop-blur-sm shadow-md">
          {code}
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </div>
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
