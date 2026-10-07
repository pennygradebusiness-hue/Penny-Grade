import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { safeRedirect } from "@/lib/use-session";

const schema = z.object({
  full_name: z.string().trim().min(2, "Please enter your full name").max(100),
  mobile: z.string().trim().regex(/^\+?[0-9 ]{10,15}$/, "Enter a valid mobile number"),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

export const Route = createFileRoute("/register")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Become a Member | PennyGrade" },
      { name: "description", content: "Create your PennyGrade account to access exclusive partner discounts." },
      { property: "og:title", content: "Join PennyGrade" },
      { property: "og:description", content: "One membership. Exclusive benefits." },
    ],
  }),
  component: Register,
});

function Register() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [f, setF] = useState({ full_name: "", mobile: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(f);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    const target = safeRedirect(redirect) ?? "/account";
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { data: { full_name: parsed.data.full_name, mobile: parsed.data.mobile }, emailRedirectTo: `${window.location.origin}${target}` },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (data.session) navigate({ to: target, replace: true });
    else setSent(true);
  };

  if (sent) return (
    <AuthShell title="Check your email" subtitle="We've sent a confirmation link. Once confirmed, log in — our team will activate your membership.">
      <Button asChild className="w-full"><Link to="/login" search={{ redirect }}>Go to login</Link></Button>
    </AuthShell>
  );

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <AuthShell title="Become a Member" subtitle="Create your account. Membership is ₹500/year and activated by the PennyGrade team."
      footer={<>Already a member? <Link to="/login" search={{ redirect }} className="font-medium text-foreground underline">Log in</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5"><Label>Full name</Label><Input required value={f.full_name} onChange={set("full_name")} className="h-11" autoComplete="name" /></div>
        <div className="space-y-1.5"><Label>Mobile</Label><Input required type="tel" value={f.mobile} onChange={set("mobile")} className="h-11" placeholder="+91 98765 43210" autoComplete="tel" /></div>
        <div className="space-y-1.5"><Label>Email</Label><Input required type="email" value={f.email} onChange={set("email")} className="h-11" autoComplete="email" /></div>
        <div className="space-y-1.5"><Label>Password</Label><Input required type="password" value={f.password} onChange={set("password")} className="h-11" autoComplete="new-password" /></div>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Creating account…" : "Create account"}</Button>
      </form>
    </AuthShell>
  );
}
