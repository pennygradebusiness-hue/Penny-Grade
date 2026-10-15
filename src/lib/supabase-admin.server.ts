import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Authoritative Server-Side Supabase Client & Operations
 *
 * This module runs strictly on the server (Node/serverless runtime, never client-side).
 * It uses SUPABASE_SERVICE_ROLE_KEY when configured, or delegates to authenticated
 * database RPC functions via the server-side Supabase client.
 */

let _serviceClient: SupabaseClient | null = null;

export function getServiceRoleClient(): SupabaseClient | null {
  if (typeof process === "undefined" || !process.env) return null;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

  if (!serviceKey || !url) {
    return null;
  }

  if (!_serviceClient) {
    _serviceClient = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return _serviceClient;
}

/**
 * Returns the best available server-side client (Service Role if available, else standard server client)
 */
export function getServerSupabase(): SupabaseClient {
  const service = getServiceRoleClient();
  if (service) return service;
  return supabase;
}
