import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { CreditCard, History, ArrowRight } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/register")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "PennyGrade Membership | Direct Card Verification" },
      { name: "description", content: "PennyGrade V1 operates via physical membership cards. No customer registration required." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RegisterNotice,
});

function RegisterNotice() {
  const { redirect } = Route.useSearch();

  return (
    <AuthShell
      title="Physical Card Membership"
      subtitle="PennyGrade V1 does not require customer registration"
      footer={
        <>
          Looking for administrator access?{" "}
          <Link to="/admin/login" className="font-semibold text-gold underline">
            Admin Sign In
          </Link>
        </>
      }
    >
      <div className="space-y-4 text-center">
        <div className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground shadow-sm">
          <p className="font-semibold text-foreground">How PennyGrade Works</p>
          <p className="mt-1 leading-relaxed">
            Members receive a physical PennyGrade card containing a unique ID (e.g. PEN-7X4P-92LM). No online password or customer signup is needed. Simply scan the permanent counter QR at any partner venue to redeem your discounts.
          </p>
        </div>

        {redirect?.startsWith("/p/") && (
          <Button asChild size="lg" className="w-full bg-gold font-bold text-accent-foreground hover:bg-gold-soft">
            <a href={redirect} className="flex items-center justify-center gap-2">
              Continue to Partner QR <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        )}

        <div className="space-y-2 pt-2">
          <Button asChild size="lg" className="w-full bg-gold font-bold text-accent-foreground hover:bg-gold-soft">
            <Link to="/partners">Explore Partner Directory</Link>
          </Button>

          <Button asChild variant="outline" size="lg" className="w-full">
            <Link to="/history" className="flex items-center justify-center gap-2">
              <History className="h-4 w-4" /> Check Member History
            </Link>
          </Button>
        </div>
      </div>
    </AuthShell>
  );
}
