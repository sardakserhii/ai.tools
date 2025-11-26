import { config as dotenvConfig } from "dotenv";
import { z } from "zod";

// Load .env file in development
dotenvConfig();

/**
 * Environment variables schema with validation
 */
const envSchema = z.object({
    SUPABASE_URL: z
        .string()
        .url("SUPABASE_URL must be a valid URL")
        .min(1, "SUPABASE_URL is required"),

    SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY is required"),

    SUPABASE_SERVICE_ROLE_KEY: z
        .string()
        .min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),

    NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),

    // Proxy settings (optional)
    PROXY_URL: z.string().url().optional(),
    PROXY_ENABLED: z
        .string()
        .transform((val) => val === "true")
        .default("false"),

    // Fetch settings
    FETCH_TIMEOUT_MS: z
        .string()
        .transform((val) => parseInt(val, 10))
        .default("15000"),
    FETCH_RETRY_COUNT: z
        .string()
        .transform((val) => parseInt(val, 10))
        .default("2"),
});

/**
 * Parse and validate environment variables
 */
function loadConfig() {
    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors;
        const errorMessages = Object.entries(errors)
            .map(([field, messages]) => `  ${field}: ${messages?.join(", ")}`)
            .join("\n");

        console.error("❌ Invalid environment variables:\n" + errorMessages);
        throw new Error("Invalid environment configuration");
    }

    return {
        supabaseUrl: parsed.data.SUPABASE_URL,
        supabaseAnonKey: parsed.data.SUPABASE_ANON_KEY,
        supabaseServiceRoleKey: parsed.data.SUPABASE_SERVICE_ROLE_KEY,
        nodeEnv: parsed.data.NODE_ENV,
        isDevelopment: parsed.data.NODE_ENV === "development",
        isProduction: parsed.data.NODE_ENV === "production",
        // Proxy settings
        proxyUrl: parsed.data.PROXY_URL,
        proxyEnabled: parsed.data.PROXY_ENABLED,
        // Fetch settings
        fetchTimeoutMs: parsed.data.FETCH_TIMEOUT_MS,
        fetchRetryCount: parsed.data.FETCH_RETRY_COUNT,
    };
}

/**
 * Validated configuration object
 * Throws an error if environment variables are invalid
 */
export const config = loadConfig();

export type Config = typeof config;
