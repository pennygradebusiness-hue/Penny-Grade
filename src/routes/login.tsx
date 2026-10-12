import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { ShieldCheck, History, ArrowRight, UserCheck } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Customer Login Deprecated | PennyGrade V1" },
      { name: "description", content: "PennyGrade V1 does not require customer login. Members use their physical card number directly." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LoginDeprecated,
});

function LoginDeprecated() {
  const { redirect } = Route.useSearch();

  return (
    <AuthShell
      title="No Login Required"
      subtitle="PennyGrade V1 uses physical card verification"
      footer={
        <>
          Are you a PennyGrade administrator?{" "}
          <Link to="/admin/login" className="font-semibold text-gold underline">
            Admin Login
          </Link>
        </>
      }
    >
      <div className="space-y-4 text-center">
        <div className="rounded-2xl border bg-muted/40 p-5 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Customer accounts are not required</p>
          <p className="mt-1 leading-relaxed">
            In PennyGrade V1, members identify themselves directly at partner locations by scanning the counter QR code and entering their unique membership / card number.
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
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link to="/history" className="flex items-center justify-center gap-2">
              <History className="h-4 w-4" /> Check Member History
            </Link>
          </Button>

          <Button asChild variant="ghost" size="lg" className="w-full">
            <Link to="/partners">Browse Partner Directory</Link>
          </Button>
        </div>
      </div>
    </AuthShell>
  );
}
