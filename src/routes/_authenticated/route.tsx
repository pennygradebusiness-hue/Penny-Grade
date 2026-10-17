import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getAdminSession, clearAdminSession, checkAdminSessionStatus } from "@/lib/admin-session";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  beforeLoad: async ({ location }) => {
    // 1. For admin routes, strictly validate admin session and token expiration
    if (location.pathname.startsWith("/admin")) {
      const logoutInProgress = typeof window !== "undefined" ? sessionStorage.getItem("admin_logout_in_progress") : null;
      if (logoutInProgress) {
        sessionStorage.removeItem("admin_logout_in_progress");
        throw redirect({ to: "/admin/login", search: { reason: "signed_out" } });
      }

      const status = checkAdminSessionStatus();
      if (status === "valid") {
        const adminSession = getAdminSession();
        if (adminSession && adminSession.id && adminSession.email) {
          return { user: { id: adminSession.id, email: adminSession.email } };
        }
      }

      clearAdminSession();
      if (status === "expired") {
        throw redirect({
          to: "/admin/login",
          search: { reason: "session_expired" },
        });
      }
      throw redirect({ to: "/admin/login" });
    }

    // 2. Standard user session check (for account history, profile, etc.)
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        return { user: data.user };
      }
    } catch {
      // ignore
    }

    throw redirect({ to: "/history" });
  },
  component: () => <Outlet />,
});
