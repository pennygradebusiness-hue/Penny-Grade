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

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Log in | PennyGrade" },
      { name: "description", content: "Log in to use your PennyGrade membership benefits." },
      { property: "og:title", content: "Log in to PennyGrade" },
      { property: "og:description", content: "Access your PennyGrade membership." },
    ],
  }),
  component: Login,
});

function Login() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const target = safeRedirect(redirect) ?? "/account";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return toast.error(error.message === "Email not confirmed" ? "Please confirm your email first." : "Incorrect email or password.");
    navigate({ to: target, replace: true });
  };

  return (
    <AuthShell title="Welcome back" subtitle={redirect?.startsWith("/p/") ? "Log in to use your PennyGrade membership" : "Log in to your PennyGrade account"}
      footer={<>New to PennyGrade? <Link to="/register" search={{ redirect }} className="font-medium text-foreground underline">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" /></div>
        <div className="space-y-1.5"><Label htmlFor="pw">Password</Label><Input id="pw" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" /></div>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Logging in…" : "Log in"}</Button>
      </form>
    </AuthShell>
  );
}
