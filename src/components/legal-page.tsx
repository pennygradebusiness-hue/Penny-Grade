import React from "react";
import { Link } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/site";
import { 
  FileText, 
  Shield, 
  Handshake, 
  CreditCard, 
  AlertCircle, 
  Printer, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  CheckCircle2 
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface LegalTocItem {
  id: string;
  title: string;
}

interface LegalDocLayoutProps {
  currentPath: "/terms" | "/privacy" | "/merchant-agreement" | "/membership-terms" | "/disclaimer";
  title: string;
  subtitle: string;
  version?: string;
  effectiveDate?: string;
  lastUpdated?: string;
  toc: LegalTocItem[];
  children: React.ReactNode;
}

const LEGAL_DOCS = [
  { path: "/terms", label: "Terms & Conditions", icon: FileText },
  { path: "/privacy", label: "Privacy Policy", icon: Shield },
  { path: "/merchant-agreement", label: "Merchant Agreement", icon: Handshake },
  { path: "/membership-terms", label: "Membership Terms", icon: CreditCard },
  { path: "/disclaimer", label: "Website Disclaimer", icon: AlertCircle },
] as const;

export function LegalDocLayout({
  currentPath,
  title,
  subtitle,
  version = "1.0 (Production)",
  effectiveDate = "October 14, 2026",
  lastUpdated = "October 14, 2026",
  toc,
  children,
}: LegalDocLayoutProps) {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <SiteLayout>
      {/* Hero Section */}
      <PageHero
        title={title}
        breadcrumbs={[
          { label: "Legal", to: "/terms" },
          { label: title },
        ]}
      />

      {/* Document Subheader / Meta Bar */}
      <div className="border-b border-border/80 bg-muted/30 py-4 print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 font-semibold text-primary">
              <CheckCircle2 className="h-3 w-3" />
              v{version}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Effective: {effectiveDate}
            </span>
            <span>·</span>
            <span>Last Updated: {lastUpdated}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 gap-1.5 text-xs font-medium"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Document</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Legal Sub-Navigation Tabs */}
      <div className="border-b border-border/60 bg-background/95 sticky top-16 z-20 backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-6xl overflow-x-auto px-4 py-2 sm:px-6 no-scrollbar">
          <nav className="flex space-x-1" aria-label="Legal documents">
            {LEGAL_DOCS.map((doc) => {
              const Icon = doc.icon;
              const isActive = doc.path === currentPath;
              return (
                <Link
                  key={doc.path}
                  to={doc.path}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {doc.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Grid: Sticky Sidebar TOC + Article Body */}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Left Column: Table of Contents & Contact Desk */}
          <aside className="lg:col-span-4 print:hidden">
            <div className="sticky top-32 space-y-6">
              {/* Table of Contents Card */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs">
                <h3 className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Table of Contents
                </h3>
                <nav className="mt-4 space-y-1 text-xs">
                  {toc.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="block rounded-lg px-2.5 py-1.5 text-slate-700 transition-colors hover:bg-muted hover:text-primary dark:text-slate-300"
                    >
                      {item.title}
                    </a>
                  ))}
                </nav>
              </div>

              {/* Legal & Grievance Contact Box */}
              <div className="rounded-2xl border border-border/80 bg-muted/40 p-5 text-xs text-muted-foreground space-y-3">
                <h4 className="font-semibold text-foreground">Legal & Grievance Desk</h4>
                <p className="text-[11px] leading-relaxed">
                  For statutory notices, grievance redressal, or verified merchant agreements, please reach out to our Daltonganj desk:
                </p>
                <div className="space-y-2 pt-1 font-medium text-foreground">
                  <a
                    href="mailto:pennygradebusiness@gmail.com"
                    className="flex items-center gap-2 text-slate-800 hover:text-amber-600 transition-colors dark:text-slate-200"
                  >
                    <Mail className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">pennygradebusiness@gmail.com</span>
                  </a>
                  <a
                    href="tel:+919356897893"
                    className="flex items-center gap-2 text-slate-800 hover:text-amber-600 transition-colors dark:text-slate-200"
                  >
                    <Phone className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>+91 93568 97893</span>
                  </a>
                  <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>Daltonganj, Palamu, Jharkhand - 822101, India</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Column: Legal Content Prose */}
          <article className="lg:col-span-8">
            <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-10 shadow-2xs">
              <header className="mb-8 border-b border-border/80 pb-6">
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {title}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {subtitle}
                </p>
              </header>

              <div className="prose prose-slate max-w-none text-slate-700 dark:prose-invert dark:text-slate-300 text-sm leading-relaxed space-y-8">
                {children}
              </div>
            </div>
          </article>
        </div>
      </div>
    </SiteLayout>
  );
}
