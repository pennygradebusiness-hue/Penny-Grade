import { readFileSync } from "node:fs";

const envPath = process.argv[2] || ".env";
let envText;
try {
  envText = readFileSync(envPath, "utf8");
} catch {
  console.error(`Cannot read ${envPath}. Copy .env.example to .env and set the Supabase project values.`);
  process.exit(1);
}

const values = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*["']?([^"'#\s]+)["']?/))
    .filter(Boolean)
    .map((match) => [match[1], match[2]]),
);

const config = readFileSync("supabase/config.toml", "utf8");
const configuredId = config.match(/^project_id\s*=\s*["']([^"']+)["']/m)?.[1];
const projectId = values.SUPABASE_PROJECT_ID;
const publicProjectId = values.VITE_SUPABASE_PROJECT_ID;
const urls = [values.SUPABASE_URL, values.VITE_SUPABASE_URL].filter(Boolean);
const errors = [];

if (!configuredId) errors.push("supabase/config.toml has no project_id.");
if (!projectId) errors.push("SUPABASE_PROJECT_ID is missing.");
if (!values.SUPABASE_URL) errors.push("SUPABASE_URL is missing.");
if (!values.VITE_SUPABASE_URL) errors.push("VITE_SUPABASE_URL is missing.");
if (!values.SUPABASE_PUBLISHABLE_KEY && !values.VITE_SUPABASE_PUBLISHABLE_KEY) {
  errors.push("A Supabase publishable key is missing.");
}
if (configuredId && projectId && configuredId !== projectId) {
  errors.push("SUPABASE_PROJECT_ID does not match supabase/config.toml.");
}
if (projectId && publicProjectId && projectId !== publicProjectId) {
  errors.push("VITE_SUPABASE_PROJECT_ID does not match SUPABASE_PROJECT_ID.");
}
for (const url of urls) {
  try {
    const hostname = new URL(url).hostname;
    if (projectId && hostname !== `${projectId}.supabase.co`) {
      errors.push("A Supabase URL points to a different project than SUPABASE_PROJECT_ID.");
    }
  } catch {
    errors.push("A Supabase URL is invalid.");
  }
}

if (errors.length) {
  console.error(`Supabase target check failed for ${envPath}:`);
  for (const error of [...new Set(errors)]) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Supabase target check passed for ${envPath}.`);
console.log(`Project: ${projectId} (matches local Supabase CLI config and browser/server endpoints).`);
console.log("Credentials were not printed. This checks the configured target, not hosted production environment variables.");
