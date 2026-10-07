import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin Login | PennyGrade" }, { name: "robots", content: "noindex" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) { setBusy(false); return toast.error("Incorrect email or password."); }
    let { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: (await supabase.auth.getUser()).data.user!.id });
    if (!isAdmin) {
      const { data: exists } = await supabase.rpc("admin_exists");
      if (!exists && confirm("No PennyGrade administrator exists yet. Make this account the Super Admin?")) {
        const { data: claimed } = await supabase.rpc("claim_first_admin");
        isAdmin = !!claimed;
      }
    }
    setBusy(false);
    if (!isAdmin) { await supabase.auth.signOut(); return toast.error("This account does not have admin access."); }
    navigate({ to: "/admin", replace: true });
  };
  return (
    <AuthShell title="Admin sign in" subtitle="PennyGrade operations console">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5"><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" /></div>
        <div className="space-y-1.5"><Label>Password</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" /></div>
        <Button className="w-full" size="lg" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
      </form>
    </AuthShell>
  );
}
