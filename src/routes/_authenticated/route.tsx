import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        return { user: data.user };
      }
    } catch {
      // ignore
    }

    // Check local admin session for admin routes
    if (typeof window !== "undefined") {
      let raw = localStorage.getItem("pennygrade_admin_session");
      if (!raw && typeof document !== "undefined") {
        const match = document.cookie.match(/(?:^|;\s*)pennygrade_admin_session=([^;]+)/);
        if (match) raw = decodeURIComponent(match[1]);
      }
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.email || parsed.role === "super_admin")) {
            return { user: { id: parsed.id ?? "admin-local", email: parsed.email ?? "admin@pennygrade.com" } };
          }
        } catch {
          // ignore
        }
      }
    }

    if (location.pathname.startsWith("/admin")) {
      throw redirect({ to: "/admin/login" });
    }
    throw redirect({ to: "/history" });
  },
  component: () => <Outlet />,
});
