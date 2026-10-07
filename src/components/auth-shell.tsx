import { Link } from "@tanstack/react-router";
import { LOGO_URL } from "@/components/brand";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden bg-navy-deep md:block">
        <img src={LOGO_URL} alt="PennyGrade" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-navy-foreground">
          <p className="font-display text-3xl font-semibold">One Membership.<br /><span className="text-gold">Exclusive Benefits.</span></p>
        </div>
      </div>
      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-10 inline-block font-display text-lg font-semibold">Penny<span className="text-accent-foreground/80">Grade</span></Link>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
