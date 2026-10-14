import { createFileRoute } from "@tanstack/react-router";
import { getSiteUrl } from "@/lib/seo";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () => {
        const origin = getSiteUrl();

        const content = [
          "# PennyGrade Robots Crawling Directives",
          `# Authoritative Origin: ${origin}`,
          "",
          "User-agent: *",
          "Allow: /",
          "Allow: /styles.css",
          "Allow: /*.css$",
          "Allow: /*.js$",
          "Allow: /*.png$",
          "Allow: /*.jpg$",
          "Allow: /*.jpeg$",
          "Allow: /*.svg$",
          "Allow: /*.ico$",
          "Allow: /*.webp$",
          "",
          "# Disallow Private & Ephemeral Application Paths",
          "Disallow: /admin",
          "Disallow: /admin/",
          "Disallow: /account",
          "Disallow: /account/",
          "Disallow: /verification",
          "Disallow: /verification/",
          "Disallow: /p/",
          "Disallow: /history",
          "Disallow: /login",
          "Disallow: /register",
          "",
          "# Sitemap Declaration",
          `Sitemap: ${origin}/sitemap.xml`,
          "",
        ].join("\n");

        return new Response(content, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
          },
        });
      },
    },
  },
});
