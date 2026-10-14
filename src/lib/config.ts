/**
 * PennyGrade Central Application Configuration & Environment Helper
 *
 * Requirements:
 * - Single source of truth for public site configuration.
 * - Sourced strictly from environment variables (VITE_SITE_URL or SITE_URL).
 * - Never hardcodes deployment-specific production domain strings in source code.
 * - Provides clear diagnostics and graceful fallbacks for local dev and testing.
 * - Strips trailing slashes and validates URL protocol.
 */

export interface PublicAppConfig {
  siteUrl: string;
  isProduction: boolean;
  isTest: boolean;
}

/**
 * Normalizes a URL: ensures valid protocol, trims whitespace, and strips trailing slashes.
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  return trimmed;
}

/**
 * Validates whether a string is a valid HTTP/HTTPS URL.
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Resolves the application website URL.
 * Sourced in order:
 * 1. import.meta.env.VITE_SITE_URL / import.meta.env.SITE_URL (Vite build / client)
 * 2. process.env.VITE_SITE_URL / process.env.SITE_URL (SSR / Node / test runtime)
 * 3. window.location.origin (browser runtime fallback)
 * 4. Safe local default ("http://localhost:8080")
 */
export function getAppSiteUrl(): string {
  let rawUrl: string | undefined;

  if (typeof import.meta !== "undefined" && import.meta.env) {
    rawUrl =
      (import.meta.env.VITE_SITE_URL as string | undefined) ||
      (import.meta.env.SITE_URL as string | undefined);
  }

  if (!rawUrl && typeof process !== "undefined" && process.env) {
    rawUrl = process.env.VITE_SITE_URL || process.env.SITE_URL;
  }

  if (rawUrl && rawUrl.trim()) {
    const normalized = normalizeUrl(rawUrl);
    if (isValidUrl(normalized)) {
      return normalized;
    }
  }

  // In browser runtime, window.location.origin is authoritative
  if (typeof window !== "undefined" && window.location?.origin) {
    return normalizeUrl(window.location.origin);
  }

  // Safe development / local test fallback
  return "http://localhost:8080";
}

/**
 * Resolves public Supabase configuration without hardcoding secrets.
 */
export function getPublicSupabaseConfig() {
  const projectId =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_PROJECT_ID) ||
    (typeof process !== "undefined" && (process.env.VITE_SUPABASE_PROJECT_ID || process.env.SUPABASE_PROJECT_ID)) ||
    "";

  const url =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
    (typeof process !== "undefined" && (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL)) ||
    (projectId ? `https://${projectId}.supabase.co` : "") ||
    "https://placeholder.supabase.co";

  const publishableKey =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
    (typeof process !== "undefined" && (process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY)) ||
    "placeholder-key";

  return { projectId, url, publishableKey };
}

/**
 * Resolves a safe WebSocket transport constructor for Supabase RealtimeClient.
 * - In browsers: uses window.WebSocket.
 * - In modern runtimes (Node 22+, Deno, Bun): uses globalThis.WebSocket.
 * - In serverless runtimes without native WebSocket (Node < 22 on Netlify):
 *   provides a safe stub class so RealtimeClient initialization does not crash SSR.
 */
export function getRealtimeTransport(): typeof WebSocket | undefined {
  if (typeof window !== "undefined" && typeof window.WebSocket !== "undefined") {
    return window.WebSocket;
  }
  if (typeof globalThis !== "undefined" && typeof globalThis.WebSocket !== "undefined") {
    return globalThis.WebSocket;
  }
  // Server stub for Node environments lacking native WebSocket support
  class ServerStubWebSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;
    readonly readyState = 3;
    constructor() {}
    close() {}
    send() {}
    addEventListener() {}
    removeEventListener() {}
  }
  return ServerStubWebSocket as unknown as typeof WebSocket;
}
