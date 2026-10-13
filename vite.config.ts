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

if (process.env.NETLIFY === "true" && !process.env.NITRO_PRESET) {
  process.env.NITRO_PRESET = "netlify";
}

// Auto-bridge Netlify environment variables if VITE_ prefix is omitted
const supabaseProjectId = process.env.VITE_SUPABASE_PROJECT_ID || process.env.SUPABASE_PROJECT_ID || "";
const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  (supabaseProjectId ? `https://${supabaseProjectId}.supabase.co` : "");
const supabasePublishableKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
const siteUrl = process.env.VITE_SITE_URL || process.env.SITE_URL || "";

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
