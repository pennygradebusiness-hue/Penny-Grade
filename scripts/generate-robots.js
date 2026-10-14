#!/usr/bin/env node
/**
 * Generates public/robots.txt from public/robots.txt.template during build.
 * Validates environment configuration and dynamically inserts the authoritative Sitemap URL.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const templatePath = path.join(rootDir, "public", "robots.txt.template");
const outputPath = path.join(rootDir, "public", "robots.txt");

function resolveSiteUrl() {
  const raw =
    process.env.VITE_SITE_URL ||
    process.env.SITE_URL;

  if (!raw || !raw.trim()) {
    if (process.env.NODE_ENV === "production" || process.env.NETLIFY === "true") {
      throw new Error(
        "[generate-robots] Fatal: VITE_SITE_URL or SITE_URL environment variable must be set in Netlify."
      );
    }
    return "http://localhost:8080";
  }

  return raw.trim().replace(/\/+$/, "");
}

function generateRobots() {
  if (!fs.existsSync(templatePath)) {
    console.error(`[generate-robots] Template not found at: ${templatePath}`);
    process.exit(1);
  }

  const siteUrl = resolveSiteUrl();
  const template = fs.readFileSync(templatePath, "utf-8");
  const content = template.replace(/\{\{SITE_URL\}\}/g, siteUrl);

  fs.writeFileSync(outputPath, content, "utf-8");
  console.log(`[generate-robots] Generated ${outputPath} with sitemap origin: ${siteUrl}`);
}

generateRobots();
