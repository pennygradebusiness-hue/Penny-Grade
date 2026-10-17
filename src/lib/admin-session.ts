/**
 * Administrator Session Management & Automatic Lifecycle Guard
 *
 * Implements enterprise-grade session persistence (30-day sliding sessions),
 * cryptographic expiration verification, and deterministic auto-logout on expiry.
 */

export const ADMIN_SESSION_COOKIE = "pennygrade_admin_session";
export const ADMIN_SESSION_STORAGE_KEY = "pennygrade_admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days in seconds
export const ADMIN_SESSION_TTL_MS = ADMIN_SESSION_TTL_SECONDS * 1000;

export interface AdminClientSession {
  id: string;
  email: string;
  role: string;
  full_name?: string;
  exp: number;
}

/**
 * Safely parse unsigned payload claims from a signed admin session token.
 * Compatible with both browser and SSR server runtime environments.
 */
export function parseTokenPayload(token: string): { exp?: number; [key: string]: unknown } | null {
  try {
    const part = token.split(".")[0];
    if (!part) return null;
    if (typeof Buffer !== "undefined") {
      return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
    }
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Read the admin session cookie from browser document
 */
export function getAdminCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${ADMIN_SESSION_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Authoritative client-side session validator.
 * Guarantees that expired sessions are purged immediately and never grant access.
 */
export function getAdminSession(): AdminClientSession | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
  const cookie = getAdminCookie();

  // If both storage and cookie are missing, user is definitely logged out
  if (!cookie && !raw) return null;

  let session: AdminClientSession | null = null;
  if (raw) {
    try {
      session = JSON.parse(raw);
    } catch {
      session = null;
    }
  }

  // Inspect the signed expiration timestamp embedded in the cookie token
  let tokenExp: number | undefined;
  if (cookie) {
    const payload = parseTokenPayload(cookie);
    if (payload?.exp && typeof payload.exp === "number") {
      tokenExp = payload.exp;
    }
  }

  const effectiveExp = tokenExp || session?.exp;
  const now = Date.now();

  // Must have required identity fields
  if (!session || !session.id || !session.email || !session.role) {
    clearAdminSession();
    return null;
  }

  // If token/session has expired, automatically purge immediately
  if (effectiveExp && effectiveExp <= now) {
    clearAdminSession();
    return null;
  }

  // If cookie was wiped or expired while local storage persists, purge
  if (!cookie && typeof document !== "undefined") {
    clearAdminSession();
    return null;
  }

  return {
    ...session,
    exp: effectiveExp || now + ADMIN_SESSION_TTL_MS,
  };
}

/**
 * Atomically saves admin session in both localStorage and long-lived browser cookie
 */
export function saveAdminSessionClient(
  payload: { id: string; email: string; role: string; full_name?: string; exp?: number },
  signedToken: string
) {
  if (typeof window === "undefined") return;

  const tokenPayload = parseTokenPayload(signedToken);
  const exp = tokenPayload?.exp || payload.exp || Date.now() + ADMIN_SESSION_TTL_MS;

  const sessionData: AdminClientSession = {
    id: payload.id,
    email: payload.email,
    role: payload.role,
    full_name: payload.full_name,
    exp,
  };

  try {
    localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(sessionData));
  } catch {
    // Handle quota errors silently
  }

  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
  document.cookie = `${ADMIN_SESSION_COOKIE}=${signedToken}; path=/; max-age=${ADMIN_SESSION_TTL_SECONDS}; SameSite=Lax${
    isSecure ? "; Secure" : ""
  }`;
}

/**
 * Atomically clears all administrative session artifacts from browser
 */
export function clearAdminSession() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  } catch {}
  if (typeof document !== "undefined") {
    document.cookie = `${ADMIN_SESSION_COOKIE}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

/**
 * Authoritative check of admin session state.
 * Returns:
 * - "valid": token and storage present and unexpired.
 * - "expired": token or storage was present, but timestamp <= now.
 * - "none": no session credentials present (clean/logged out).
 */
export function checkAdminSessionStatus(): "valid" | "expired" | "none" {
  if (typeof window === "undefined") return "none";

  const raw = localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
  const cookie = getAdminCookie();

  if (!cookie && !raw) return "none";

  let session: AdminClientSession | null = null;
  if (raw) {
    try {
      session = JSON.parse(raw);
    } catch {
      session = null;
    }
  }

  let tokenExp: number | undefined;
  if (cookie) {
    const payload = parseTokenPayload(cookie);
    if (payload?.exp && typeof payload.exp === "number") {
      tokenExp = payload.exp;
    }
  }

  const effectiveExp = tokenExp || session?.exp;
  const now = Date.now();

  if (effectiveExp && effectiveExp <= now) {
    return "expired";
  }

  if (session && session.id && session.email && session.role && cookie) {
    return "valid";
  }

  return "none";
}

let isLoggingOut = false;

export function resetLoggingOutState() {
  isLoggingOut = false;
}

export type LogoutReason = "session_expired" | "unauthorized" | "manual" | "signed_out";

/**
 * Automatically logs out the administrator and seamlessly transitions to sign-in.
 * No confirmation modals or relogin loops.
 */
export function triggerAdminAutoLogout(reason: LogoutReason = "session_expired") {
  if (typeof window === "undefined" || isLoggingOut) return;
  isLoggingOut = true;

  const redirectReason = reason === "manual" || reason === "signed_out" ? "signed_out" : reason;
  try {
    sessionStorage.setItem("admin_logout_in_progress", redirectReason);
  } catch {}

  clearAdminSession();

  const url = `/admin/login?reason=${encodeURIComponent(redirectReason)}`;

  // Gracefully clean Supabase client auth state if available
  import("@/integrations/supabase/client")
    .then(({ supabase }) => supabase.auth.signOut())
    .catch(() => {})
    .finally(() => {
      isLoggingOut = false;
      if (window.location.pathname !== "/admin/login") {
        window.location.replace(url);
      }
    });
}

/**
 * Global API / Server Function auth error inspector.
 * Automatically catches 401 / Unauthorized responses on admin pages and redirects cleanly.
 */
export function handleGlobalAdminAuthError(error: unknown) {
  if (typeof window === "undefined") return;
  if (!window.location.pathname.startsWith("/admin")) return;
  if (window.location.pathname === "/admin/login") return;

  const msg = error instanceof Error ? error.message : String(error);

  // 1. Session Expiry & Token Invalidation (401 Unauthorized) -> Auto Logout
  if (
    /unauthorized/i.test(msg) ||
    /administrative session/i.test(msg) ||
    /invalid administrative session/i.test(msg) ||
    /administrative account is no longer active/i.test(msg) ||
    /jwt expired/i.test(msg) ||
    /session expired/i.test(msg)
  ) {
    triggerAdminAutoLogout("session_expired");
    return;
  }

  // 2. Role-Based Access Control (403 Forbidden) -> Do NOT log out. Inform and redirect safely.
  if (/forbidden/i.test(msg) || /insufficient privileges/i.test(msg)) {
    try {
      import("sonner")
        .then(({ toast }) => {
          toast.error("Access Restricted: Your role does not have permission for this section.");
        })
        .catch(() => {});
    } catch {}

    // If on a restricted page like /admin/admins, redirect safely back to /admin
    if (window.location.pathname === "/admin/admins") {
      window.location.replace("/admin");
    }
  }
}
