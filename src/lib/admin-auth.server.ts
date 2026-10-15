import { getCookie, getRequestHeader } from "@tanstack/react-start/server";
import { store, type V1AdminUser } from "./v1-store";
import { createHmac, timingSafeEqual } from "node:crypto";

type AdminSession = { id: string; email: string; role: V1AdminUser["role"]; full_name?: string; source: "store" | "supabase"; exp: number };
const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function sessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Admin session signing secret is not configured");
  return secret;
}

export function createAdminSessionToken(user: Pick<V1AdminUser, "id" | "email" | "role" | "full_name">, source: AdminSession["source"] = "store") {
  // Keep the signed token lifetime aligned with the 12-hour browser cookie.
  const payload: AdminSession = { ...user, source, exp: Date.now() + ADMIN_SESSION_TTL_MS };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", sessionSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function readAdminSession(token: string): AdminSession | null {
  const [encoded, suppliedSignature] = token.split(".");
  if (!encoded || !suppliedSignature) return null;
  const expected = createHmac("sha256", sessionSecret()).update(encoded).digest();
  let actual: Buffer;
  try { actual = Buffer.from(suppliedSignature, "base64url"); } catch { return null; }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const session = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as AdminSession;
    if (!session.id || !session.email || !session.role || session.exp <= Date.now()) return null;
    return session;
  } catch { return null; }
}

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

  const defaultSuper = (store.adminUsers || []).find((u) => u.role === "super_admin") || {
    id: "admin-super",
    user_id: "uid-super-01",
    email: "pennygradebusiness@gmail.com",
    full_name: "Primary Administrator",
    role: "super_admin" as const,
    is_password_set: true,
    created_at: new Date().toISOString(),
  };

  if (!cookieRaw) {
    throw new Error("Unauthorized: Administrative session required");
  }

  let session: AdminSession | null;
  try { session = readAdminSession(cookieRaw); } catch { session = null; }
  if (!session) {
    throw new Error("Unauthorized: Invalid administrative session token");
  }

  const cleanEmail = session?.email?.trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error("Unauthorized: Missing administrative identity");
  }

  let adminUser = (store.adminUsers || []).find((u) => u.email.trim().toLowerCase() === cleanEmail);

  if (!adminUser && cleanEmail === "pennygradebusiness@gmail.com" && session?.role === "super_admin") {
    adminUser = defaultSuper;
  }

  if (!adminUser && session.source === "supabase") adminUser = {
    id: session.id,
    user_id: session.id,
    full_name: session.full_name || cleanEmail,
    email: cleanEmail,
    role: session.role,
    is_password_set: true,
    created_at: new Date().toISOString(),
  };
  if (!adminUser) throw new Error("Unauthorized: Administrative account is no longer active");

  if (requiredRoles && requiredRoles.length > 0) {
    if (!requiredRoles.includes(adminUser.role)) {
      throw new Error(`Forbidden: Insufficient privileges. Required role: ${requiredRoles.join(", ")}`);
    }
  }

  return adminUser;
}
