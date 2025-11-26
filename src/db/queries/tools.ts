import { supabase } from "../supabaseClient.js";
import type { Tool } from "../types.js";

/**
 * Get all active tools from the database
 * @returns Array of active Tool entities
 * @throws Error if database query fails
 */
export async function getActiveTools(): Promise<Tool[]> {
    console.log("[tools] Fetching active tools from database...");

    const { data, error } = await supabase
        .from("tools")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

    if (error) {
        console.error("[tools] Error fetching active tools:", error.message);
        throw new Error(`Failed to fetch active tools: ${error.message}`);
    }

    console.log(`[tools] Found ${data?.length ?? 0} active tools`);
    return (data as Tool[] | null) ?? [];
}

/**
 * Get a specific tool by ID
 * @param id Tool identifier
 * @returns Tool entity or null if not found
 * @throws Error if database query fails
 */
export async function getToolById(id: string): Promise<Tool | null> {
    const { data, error } = await supabase
        .from("tools")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        if (error.code === "PGRST116") {
            // No rows returned
            return null;
        }
        console.error(`[tools] Error fetching tool ${id}:`, error.message);
        throw new Error(`Failed to fetch tool: ${error.message}`);
    }

    return data as Tool | null;
}

/**
 * Get all tools (including inactive)
 * @returns Array of all Tool entities
 * @throws Error if database query fails
 */
export async function getAllTools(): Promise<Tool[]> {
    const { data, error } = await supabase
        .from("tools")
        .select("*")
        .order("name", { ascending: true });

    if (error) {
        console.error("[tools] Error fetching all tools:", error.message);
        throw new Error(`Failed to fetch all tools: ${error.message}`);
    }

    return (data as Tool[] | null) ?? [];
}
