import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { getSiteUrl } from "@/lib/seo";
import { getRealtimeTransport } from "@/lib/config";
import { store, type V1Partner } from "@/lib/v1-store";
import type { Database } from "@/integrations/supabase/types";

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}

function formatLastMod(dateStr?: string | null): string {
  if (!dateStr) return new Date().toISOString().slice(0, 10);
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
    return d.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

interface SitemapUrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: "daily" | "weekly" | "monthly";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const origin = getSiteUrl();

        // 1. Authoritative public indexable pages only
        const staticEntries: SitemapUrlEntry[] = [
          { loc: `${origin}/`, priority: "1.0", changefreq: "daily" },
          { loc: `${origin}/how-it-works`, priority: "0.8", changefreq: "weekly" },
          { loc: `${origin}/partners`, priority: "0.9", changefreq: "daily" },
          { loc: `${origin}/offers`, priority: "0.9", changefreq: "daily" },
          { loc: `${origin}/become-a-member`, priority: "0.8", changefreq: "weekly" },
          { loc: `${origin}/partner-with-us`, priority: "0.8", changefreq: "weekly" },
          { loc: `${origin}/terms`, priority: "0.3", changefreq: "monthly" },
          { loc: `${origin}/privacy`, priority: "0.3", changefreq: "monthly" },
          { loc: `${origin}/merchant-agreement`, priority: "0.3", changefreq: "monthly" },
          { loc: `${origin}/membership-terms`, priority: "0.3", changefreq: "monthly" },
          { loc: `${origin}/disclaimer`, priority: "0.3", changefreq: "monthly" },
        ];

        // 2. Dynamically load verified, ACTIVE partner outlets (filtering out any deleted partners)
        const partnerEntries: SitemapUrlEntry[] = [];
        const seenSlugs = new Set<string>();
        const delPartnerSet = new Set(store.deletedPartnerIds || []);

        // Check in-memory store first
        if (store.partners && store.partners.size > 0) {
          for (const partner of store.partners.values()) {
            if (
              partner.status === "ACTIVE" &&
              partner.slug &&
              !delPartnerSet.has(partner.id) &&
              !delPartnerSet.has(partner.slug) &&
              !seenSlugs.has(partner.slug)
            ) {
              seenSlugs.add(partner.slug);
              partnerEntries.push({
                loc: `${origin}/partners/${escapeXml(partner.slug)}`,
                lastmod: formatLastMod(partner.updated_at),
                priority: partner.featured ? "0.8" : "0.7",
                changefreq: "weekly",
              });
            }
          }
        }

        // If store didn't have partners, attempt Supabase read with timeout protection
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseKey =
          process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        if (supabaseUrl && supabaseKey && (!store.partners || store.partners.size === 0)) {
          try {
            const sb = createClient<Database>(supabaseUrl, supabaseKey, {
              auth: { persistSession: false },
              global: {
                fetch: (url, opts) => fetch(url, { ...opts, signal: AbortSignal.timeout(1500) }),
              },
              realtime: {
                transport: getRealtimeTransport(),
              },
            });
            const { data, error } = await sb
              .from("partners")
              .select("id,slug,updated_at,status")
              .eq("status", "ACTIVE");

            if (!error && data) {
              for (const p of data) {
                if (p.slug && !delPartnerSet.has(p.id) && !delPartnerSet.has(p.slug) && !seenSlugs.has(p.slug)) {
                  seenSlugs.add(p.slug);
                  partnerEntries.push({
                    loc: `${origin}/partners/${escapeXml(p.slug)}`,
                    lastmod: formatLastMod(p.updated_at),
                    priority: "0.7",
                    changefreq: "weekly",
                  });
                }
              }
            }
          } catch (err) {
            console.error("[Sitemap] Failed to query Supabase partners for sitemap:", err);
          }
        }

        const allEntries = [...staticEntries, ...partnerEntries];

        const xmlItems = allEntries
          .map(
            (e) =>
              `  <url>\n    <loc>${e.loc}</loc>${
                e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ""
              }${e.changefreq ? `\n    <changefreq>${e.changefreq}</changefreq>` : ""}${
                e.priority ? `\n    <priority>${e.priority}</priority>` : ""
              }\n  </url>`,
          )
          .join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlItems}\n</urlset>`;

        return new Response(xml, {
          status: 200,
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
