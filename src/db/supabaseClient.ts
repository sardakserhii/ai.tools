import { createClient } from "@supabase/supabase-js";
import { config } from "../config/env.js";

/**
 * Supabase client instance configured for server-side usage
 * Uses SERVICE_ROLE_KEY for full database access
 *
 * IMPORTANT: This client should ONLY be used in server-side code (API routes, serverless functions)
 * Never expose the service role key to the client side
 */
export const supabase = createClient(
    config.supabaseUrl,
    config.supabaseServiceRoleKey,
    {
        auth: {
            // Disable session persistence for serverless environment
            persistSession: false,
            autoRefreshToken: false,
        },
        db: {
            schema: "public",
        },
    }
);

/**
 * Get a fresh Supabase client instance (useful for testing or isolation)
 */
export function createSupabaseClient() {
    return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
        db: {
            schema: "public",
        },
    });
}
