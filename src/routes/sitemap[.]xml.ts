import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
        const { data } = await sb.from("partners").select("slug,updated_at");
        const urls = ["/", "/how-it-works", "/partners", "/offers", "/register", "/login", "/terms", "/privacy"]
          .map((p) => `<url><loc>${origin}${p}</loc></url>`)
          .concat((data ?? []).map((p) => `<url><loc>${origin}/partners/${p.slug}</loc><lastmod>${p.updated_at.slice(0, 10)}</lastmod></url>`));
        return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`, {
          headers: { "content-type": "application/xml", "cache-control": "public, max-age=3600" },
        });
      },
    },
  },
});
