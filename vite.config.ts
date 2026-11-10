/**
 * PennyGrade Web Platform — Vite & TanStack Start Configuration
 *
 * Core plugins bundled via TanStack Start:
 * - TanStack Start SSR & Nitro runtime target
 * - React 19 Fast Refresh & JSX runtime
 * - Tailwind CSS v4 Vite compiler
 * - TypeScript path alias resolution (@/*)
 */
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { resolve } from "node:path";

const localQaMode = process.env.PENNYGRADE_LOCAL_QA === "1";
const localQaEnvDir = resolve(process.cwd(), ".local-qa-env");

if (localQaMode) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  let supabaseHost = "";
  try {
    supabaseHost = new URL(supabaseUrl).hostname;
  } catch {
    throw new Error("Local QA requires a valid loopback Supabase URL.");
  }
  if (!["localhost", "127.0.0.1", "::1"].includes(supabaseHost)) {
    throw new Error("Local QA blocked: Supabase must resolve to loopback.");
  }
  if (process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_SECRET) {
    throw new Error("Local QA blocked: Razorpay credentials must be absent.");
  }
  if (!process.env.RESEND_API_KEY?.startsWith("re_mock_")) {
    throw new Error("Local QA blocked: Resend must use the mock provider.");
  }
}

if (process.env.NETLIFY === "true" && !process.env.NITRO_PRESET) {
  process.env.NITRO_PRESET = "netlify";
}
if (process.env.VERCEL && !process.env.NITRO_PRESET) {
  process.env.NITRO_PRESET = "vercel";
}

// Auto-bridge production environment variables with safe defaults
const isProd = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL) || Boolean(process.env.NETLIFY);
const supabaseProjectId =
  process.env.VITE_SUPABASE_PROJECT_ID || process.env.SUPABASE_PROJECT_ID || "gvdrpojyoznepohqrbpd";
const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  (supabaseProjectId ? `https://${supabaseProjectId}.supabase.co` : "https://gvdrpojyoznepohqrbpd.supabase.co");
const supabasePublishableKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_TylvCZPl31m5no_GsQe7Kw_g9iPk_k6";
const siteUrl =
  process.env.VITE_SITE_URL ||
  process.env.SITE_URL ||
  (isProd ? "https://www.pennygrade.in" : "http://localhost:8080");

if (supabaseProjectId && !process.env.VITE_SUPABASE_PROJECT_ID) {
  process.env.VITE_SUPABASE_PROJECT_ID = supabaseProjectId;
}
if (supabaseUrl && !process.env.VITE_SUPABASE_URL) {
  process.env.VITE_SUPABASE_URL = supabaseUrl;
}
if (supabasePublishableKey && !process.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = supabasePublishableKey;
}
if (siteUrl && !process.env.VITE_SITE_URL) {
  process.env.VITE_SITE_URL = siteUrl;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default (defineConfig as any)({
  ...(localQaMode ? { envDir: localQaEnvDir } : {}),
  server: {
    port: 8080,
    allowedHosts: true,
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  define: {
    "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(supabaseProjectId),
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabasePublishableKey),
    "import.meta.env.VITE_SITE_URL": JSON.stringify(siteUrl),
  },
});
