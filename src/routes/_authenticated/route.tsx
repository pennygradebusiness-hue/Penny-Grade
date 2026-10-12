import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  beforeLoad: async ({ location }) => {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        if (typeof document !== "undefined") {
          const sess = JSON.stringify({
            id: data.user.id,
            email: data.user.email ?? "pennygradebusiness@gmail.com",
            role: "super_admin",
          });
          document.cookie = `pennygrade_admin_session=${encodeURIComponent(sess)}; path=/; max-age=604800; SameSite=Lax`;
          if (typeof localStorage !== "undefined") {
            localStorage.setItem("pennygrade_admin_session", sess);
          }
        }
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
        if (typeof document !== "undefined") {
          document.cookie = `pennygrade_admin_session=${encodeURIComponent(raw)}; path=/; max-age=604800; SameSite=Lax`;
        }
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
