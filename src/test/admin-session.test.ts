import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createAdminSessionToken,
  readAdminSession,
  renewAdminSessionToken,
  ADMIN_SESSION_TTL_MS,
  ADMIN_SESSION_TTL_SECONDS,
} from "@/lib/admin-auth.server";
import {
  getAdminSession,
  saveAdminSessionClient,
  clearAdminSession,
  parseTokenPayload,
  ADMIN_SESSION_STORAGE_KEY,
  ADMIN_SESSION_COOKIE,
  handleGlobalAdminAuthError,
  checkAdminSessionStatus,
  triggerAdminAutoLogout,
  resetLoggingOutState,
} from "@/lib/admin-session";

describe("Administrator Session Persistence & Enterprise Lifecycle Guard", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetLoggingOutState();
    document.cookie = `${ADMIN_SESSION_COOKIE}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  });

  describe("Long-Lived Session Generation & Parity", () => {
    it("configures 30-day default TTL (2,592,000 seconds)", () => {
      expect(ADMIN_SESSION_TTL_SECONDS).toBe(30 * 24 * 60 * 60);
      expect(ADMIN_SESSION_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000);
    });

    it("generates signed admin session tokens with 30-day expiration claim", () => {
      const now = Date.now();
      const token = createAdminSessionToken({
        id: "admin-1",
        email: "pennygradebusiness@gmail.com",
        role: "super_admin",
        full_name: "Super Administrator",
      });

      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(2);

      const payload = parseTokenPayload(token);
      expect(payload).not.toBeNull();
      expect(payload?.email).toBe("pennygradebusiness@gmail.com");
      expect(payload?.role).toBe("super_admin");
      expect(payload?.exp).toBeGreaterThanOrEqual(now + ADMIN_SESSION_TTL_MS - 5000);
      expect(payload?.exp).toBeLessThanOrEqual(now + ADMIN_SESSION_TTL_MS + 5000);
    });

    it("verifies and parses valid unexpired session tokens", () => {
      const token = createAdminSessionToken({
        id: "adm-007",
        email: "manager@pennygrade.in",
        role: "manager",
        full_name: "Operations Lead",
      });

      const parsed = readAdminSession(token);
      expect(parsed).not.toBeNull();
      expect(parsed?.id).toBe("adm-007");
      expect(parsed?.email).toBe("manager@pennygrade.in");
      expect(parsed?.role).toBe("manager");
    });

    it("strictly rejects expired session tokens on the server", () => {
      // Create a token expired 1 second ago (-1000ms TTL)
      const expiredToken = createAdminSessionToken(
        {
          id: "adm-expired",
          email: "expired@pennygrade.in",
          role: "support",
        },
        "store",
        -1000
      );

      const parsed = readAdminSession(expiredToken);
      expect(parsed).toBeNull();
    });

    it("strictly rejects tampered session signatures", () => {
      const token = createAdminSessionToken({
        id: "admin-tamper",
        email: "tamper@pennygrade.in",
        role: "manager",
      });

      const [encoded, signature] = token.split(".");
      const tampered = `${encoded}.${signature}tampered`;
      expect(readAdminSession(tampered)).toBeNull();
    });
  });

  describe("Sliding Session Renewal (Big Company Flow)", () => {
    it("renews valid tokens and slides the 30-day window forward", () => {
      const initial = createAdminSessionToken({
        id: "admin-renew",
        email: "renew@pennygrade.in",
        role: "membership_manager",
      });

      const renewed = renewAdminSessionToken(initial);
      expect(renewed).not.toBeNull();
      expect(renewed?.renewedToken).toBeDefined();
      expect(renewed?.exp).toBeGreaterThan(Date.now() + ADMIN_SESSION_TTL_MS - 1000);

      // Verify the renewed token is valid
      const parsed = readAdminSession(renewed!.renewedToken);
      expect(parsed?.email).toBe("renew@pennygrade.in");
      expect(parsed?.role).toBe("membership_manager");
    });

    it("refuses to renew expired tokens", () => {
      const expiredToken = createAdminSessionToken(
        {
          id: "adm-expired",
          email: "expired@pennygrade.in",
          role: "support",
        },
        "store",
        -5000
      );

      const renewed = renewAdminSessionToken(expiredToken);
      expect(renewed).toBeNull();
    });
  });

  describe("Client-Side Session State & Expiration Automatic Purge", () => {
    it("successfully saves and retrieves a valid active session", () => {
      const token = createAdminSessionToken({
        id: "adm-active",
        email: "active@pennygrade.in",
        role: "manager",
        full_name: "Active Manager",
      });

      saveAdminSessionClient(
        {
          id: "adm-active",
          email: "active@pennygrade.in",
          role: "manager",
          full_name: "Active Manager",
        },
        token
      );

      const session = getAdminSession();
      expect(session).not.toBeNull();
      expect(session?.email).toBe("active@pennygrade.in");
      expect(session?.role).toBe("manager");
      expect(session?.exp).toBeGreaterThan(Date.now());
    });

    it("automatically purges and returns null when session has expired", () => {
      // Create an expired token
      const expiredToken = createAdminSessionToken(
        {
          id: "adm-exp",
          email: "exp@pennygrade.in",
          role: "manager",
        },
        "store",
        -1000
      );

      saveAdminSessionClient(
        {
          id: "adm-exp",
          email: "exp@pennygrade.in",
          role: "manager",
          exp: Date.now() - 1000,
        },
        expiredToken
      );

      const session = getAdminSession();
      expect(session).toBeNull();
      // Verify storage was purged
      expect(localStorage.getItem(ADMIN_SESSION_STORAGE_KEY)).toBeNull();
    });

    it("automatically purges localStorage if browser cookie was cleared/expired", () => {
      // Simulate leftover localStorage with cookie missing
      localStorage.setItem(
        ADMIN_SESSION_STORAGE_KEY,
        JSON.stringify({
          id: "adm-stale",
          email: "stale@pennygrade.in",
          role: "super_admin",
          exp: Date.now() + 100_000,
        })
      );

      const session = getAdminSession();
      expect(session).toBeNull();
      expect(localStorage.getItem(ADMIN_SESSION_STORAGE_KEY)).toBeNull();
    });

    it("clears both storage and cookies on explicit clearAdminSession()", () => {
      const token = createAdminSessionToken({
        id: "adm-clear",
        email: "clear@pennygrade.in",
        role: "support",
      });

      saveAdminSessionClient(
        {
          id: "adm-clear",
          email: "clear@pennygrade.in",
          role: "support",
        },
        token
      );

      clearAdminSession();
      expect(localStorage.getItem(ADMIN_SESSION_STORAGE_KEY)).toBeNull();
      expect(getAdminSession()).toBeNull();
    });
  });

  describe("Global Error Handler Auto-Logout Guard", () => {
    it("detects unauthorized error and triggers automatic logout on admin paths", () => {
      const replaceSpy = vi.fn();
      delete (window as any).location;
      (window as any).location = {
        pathname: "/admin/members",
        replace: replaceSpy,
      };

      const error = new Error("Unauthorized: Administrative session required");
      handleGlobalAdminAuthError(error);

      // Verify session was cleared
      expect(localStorage.getItem(ADMIN_SESSION_STORAGE_KEY)).toBeNull();
    });

    it("does not trigger auto-logout when already on /admin/login", () => {
      const replaceSpy = vi.fn();
      delete (window as any).location;
      (window as any).location = {
        pathname: "/admin/login",
        replace: replaceSpy,
      };

      const error = new Error("Unauthorized: Invalid credentials");
      handleGlobalAdminAuthError(error);

      expect(replaceSpy).not.toHaveBeenCalled();
    });

    it("ignores non-auth errors on admin paths", () => {
      const replaceSpy = vi.fn();
      delete (window as any).location;
      (window as any).location = {
        pathname: "/admin/members",
        replace: replaceSpy,
      };

      const error = new Error("Network timeout: failed to fetch partner list");
      handleGlobalAdminAuthError(error);

      expect(replaceSpy).not.toHaveBeenCalled();
    });

    it("does not log out on 403 Forbidden / Insufficient privileges, preserving session", () => {
      const replaceSpy = vi.fn();
      delete (window as any).location;
      (window as any).location = {
        pathname: "/admin/admins",
        replace: replaceSpy,
      };

      // Set active session in localStorage
      localStorage.setItem(
        ADMIN_SESSION_STORAGE_KEY,
        JSON.stringify({ id: "adm-manager", email: "manager@pennygrade.in", role: "manager" })
      );

      const error = new Error("Forbidden: Insufficient privileges. Required role: super_admin");
      handleGlobalAdminAuthError(error);

      // Session must NOT be cleared
      expect(localStorage.getItem(ADMIN_SESSION_STORAGE_KEY)).not.toBeNull();
      // Must safely redirect away from /admin/admins to /admin
      expect(replaceSpy).toHaveBeenCalledWith("/admin");
    });
  });

  describe("Explicit Logout vs Session Expiry Disambiguation", () => {
    it("returns 'none' when no session exists", () => {
      expect(checkAdminSessionStatus()).toBe("none");
    });

    it("returns 'valid' when active session exists with cookie and storage", () => {
      const token = createAdminSessionToken({
        id: "adm-valid",
        email: "valid@pennygrade.in",
        role: "manager",
      });
      saveAdminSessionClient(
        { id: "adm-valid", email: "valid@pennygrade.in", role: "manager" },
        token
      );

      expect(checkAdminSessionStatus()).toBe("valid");
    });

    it("returns 'expired' when session is past expiration", () => {
      const expiredPayload = {
        id: "adm-old",
        email: "old@pennygrade.in",
        role: "manager",
        exp: Date.now() - 5000,
      };
      const b64 = Buffer.from(JSON.stringify(expiredPayload)).toString("base64url");
      const expiredToken = `${b64}.invalidsig`;

      saveAdminSessionClient(expiredPayload, expiredToken);

      expect(checkAdminSessionStatus()).toBe("expired");
    });

    it("records signed_out reason in sessionStorage on explicit logout", () => {
      resetLoggingOutState();
      delete (window as any).location;
      (window as any).location = {
        pathname: "/admin",
        replace: vi.fn(),
      };
      triggerAdminAutoLogout("signed_out");

      expect(sessionStorage.getItem("admin_logout_in_progress")).toBe("signed_out");
    });
  });
});
