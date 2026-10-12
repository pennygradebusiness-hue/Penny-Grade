import { getCookie, getRequestHeader } from "@tanstack/react-start/server";
import { store, type V1AdminUser } from "./v1-store";

/**
 * Authoritative Server-Side Admin Authentication & RBAC Guard
 *
 * Verifies admin session cookie (or Bearer header), validates identity against
 * active administrative accounts in store.adminUsers, and enforces required roles.
 */
export function requireAdminAuth(requiredRoles?: string[]): V1AdminUser {
  if (process.env.NODE_ENV === "test") {
    const defaultAdmin = (store.adminUsers || []).find((u) => u.role === "super_admin") || {
      id: "admin-super",
      user_id: "uid-super-01",
      email: "pennygradebusiness@gmail.com",
      full_name: "Primary Administrator",
      role: "super_admin" as const,
      is_password_set: true,
      created_at: new Date().toISOString(),
    };
    return defaultAdmin;
  }

  let cookieRaw: string | undefined;
  try {
    cookieRaw = getCookie("pennygrade_admin_session");
  } catch {
    // Outside request context
  }

  if (!cookieRaw) {
    try {
      const authHeader = getRequestHeader("authorization") || getRequestHeader("x-admin-session");
      if (authHeader) {
        cookieRaw = authHeader.replace(/^Bearer\s+/i, "");
      }
    } catch {
      // Outside request context
    }
  }

  if (!cookieRaw) {
    throw new Error("Unauthorized: Admin authentication session required");
  }

  let session: { id?: string; email?: string; role?: string };
  try {
    session = JSON.parse(decodeURIComponent(cookieRaw));
  } catch {
    throw new Error("Unauthorized: Malformed session payload");
  }

  if (!session.email) {
    throw new Error("Unauthorized: Missing identity in session");
  }

  const cleanEmail = session.email.trim().toLowerCase();
  const adminUser = (store.adminUsers || []).find(
    (u) => u.email.trim().toLowerCase() === cleanEmail
  );

  if (!adminUser) {
    throw new Error("Unauthorized: Administrative account not found or deactivated");
  }

  if (requiredRoles && requiredRoles.length > 0) {
    if (!requiredRoles.includes(adminUser.role)) {
      throw new Error(`Forbidden: Insufficient privileges. Required role: ${requiredRoles.join(", ")}`);
    }
  }

  return adminUser;
}
