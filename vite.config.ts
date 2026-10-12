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
});
