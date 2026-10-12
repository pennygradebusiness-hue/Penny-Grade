import { Link } from "@tanstack/react-router";
import { LOGO_URL, LogoMark, PhysicalCardPreview } from "@/components/brand";
import { Crown, ShieldCheck } from "lucide-react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Left side branded graphic */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-black p-12 text-white lg:flex border-r border-slate-800">
        <div className="relative z-10 flex items-center gap-3">
          <LogoMark className="h-10 w-10 ring-amber-400/30" />
          <span className="font-display text-xl font-extrabold tracking-tight">
            Penny<span className="text-amber-400">Grade</span>
          </span>
        </div>

        <div className="relative z-10 max-w-md">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-300 shadow-xs">
            <Crown className="h-3.5 w-3.5" /> Operations Console
          </span>
          <h2 className="mt-4 font-display text-4xl font-extrabold leading-tight text-white">
            Smart Local Privilege{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
              Network
            </span>
          </h2>
          <p className="mt-3 text-sm text-slate-400 leading-relaxed">
            Manage partner businesses, membership card batches, live QR codes, and cryptographic verification logs.
          </p>

          <div className="mt-6 max-w-[340px]">
            <PhysicalCardPreview interactive={false} className="shadow-2xl ring-1 ring-amber-400/30" />
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-amber-400" />
          <span>Restricted Portal · Authorized Personnel Only</span>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-slate-800/60 blur-3xl pointer-events-none" />
      </div>

      {/* Right side form */}
      <div className="flex items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
          <div className="mb-6 lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <LogoMark className="h-8 w-8" />
              <span className="font-display text-base font-extrabold text-slate-900">
                Penny<span className="text-amber-500">Grade</span>
              </span>
            </Link>
          </div>

          <h1 className="font-display text-2xl font-extrabold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1.5 text-xs font-semibold text-slate-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-6 text-center text-xs text-slate-500">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
