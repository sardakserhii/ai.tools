import { HttpsProxyAgent } from "https-proxy-agent";
import { config } from "../../config/env.js";
import type { FetchResult } from "./types.js";

/**
 * User agents for rotation to avoid detection
 */
const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
];

/**
 * Get random user agent for request
 */
function getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Create fetch options with optional proxy support
 */
function createFetchOptions(controller: AbortController): RequestInit {
    const options: RequestInit = {
        signal: controller.signal,
        headers: {
            "User-Agent": getRandomUserAgent(),
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,application/rss+xml,application/atom+xml,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
        },
    };

    // Add proxy if enabled
    if (config.proxyEnabled && config.proxyUrl) {
        const agent = new HttpsProxyAgent(config.proxyUrl);
        // @ts-expect-error - agent is valid for node-fetch
        options.agent = agent;
    }

    return options;
}

/**
 * Delay helper for retry logic
 */
function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch URL with proper error handling, timeout, proxy support, and retry logic
 */
export async function fetchUrl(
    url: string,
    timeoutMs: number = config.fetchTimeoutMs,
    retryCount: number = config.fetchRetryCount
): Promise<FetchResult> {
    let lastError = "";

    for (let attempt = 0; attempt <= retryCount; attempt++) {
        try {
            if (attempt > 0) {
                console.log(
                    `[fetchUrl] Retry ${attempt}/${retryCount} for ${url}`
                );
                await delay(1000 * attempt); // Exponential backoff
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
            const options = createFetchOptions(controller);

            const response = await fetch(url, options);

            clearTimeout(timeoutId);

            if (!response.ok) {
                lastError = `HTTP ${response.status}: ${response.statusText}`;

                // Don't retry on client errors (except 429 rate limit)
                if (
                    response.status >= 400 &&
                    response.status < 500 &&
                    response.status !== 429
                ) {
                    return {
                        ok: false,
                        contentType: "",
                        text: "",
                        error: lastError,
                    };
                }
                continue; // Retry on server errors and rate limits
            }

            const contentType = response.headers.get("content-type") || "";
            const text = await response.text();

            return {
                ok: true,
                contentType,
                text,
            };
        } catch (error) {
            lastError = error instanceof Error ? error.message : String(error);

            // Don't retry on abort (timeout)
            if (lastError.includes("abort")) {
                return {
                    ok: false,
                    contentType: "",
                    text: "",
                    error: `Timeout after ${timeoutMs}ms`,
                };
            }
        }
    }

    return {
        ok: false,
        contentType: "",
        text: "",
        error: lastError,
    };
}

/**
 * Parse a date string into a Date object
 * Handles various common formats
 */
export function parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    // Clean up the string
    const cleaned = dateStr.trim();

    // Try native Date parsing first
    const date = new Date(cleaned);
    if (!isNaN(date.getTime())) {
        return date;
    }

    // Try common patterns
    const patterns = [
        // ISO format
        /(\d{4})-(\d{2})-(\d{2})/,
        // US format with comma
        /(\w+)\s+(\d{1,2}),?\s+(\d{4})/,
        // EU format
        /(\d{1,2})\s+(\w+)\s+(\d{4})/,
    ];

    for (const pattern of patterns) {
        const match = cleaned.match(pattern);
        if (match) {
            const parsed = new Date(cleaned);
            if (!isNaN(parsed.getTime())) {
                return parsed;
            }
        }
    }

    return null;
}

/**
 * Extract text content, removing excess whitespace
 */
export function cleanText(text: string): string {
    return text.replace(/\s+/g, " ").replace(/\n+/g, " ").trim();
}

/**
 * Create a snippet from content (first N characters)
 */
export function createSnippet(
    content: string,
    maxLength: number = 200
): string {
    const cleaned = cleanText(content);
    if (cleaned.length <= maxLength) {
        return cleaned;
    }
    // Find last space before maxLength to avoid cutting words
    const lastSpace = cleaned.lastIndexOf(" ", maxLength);
    const cutPoint = lastSpace > 0 ? lastSpace : maxLength;
    return cleaned.substring(0, cutPoint) + "...";
}

/**
 * Normalize URL (ensure absolute, remove tracking params)
 */
export function normalizeUrl(url: string, baseUrl: string): string {
    try {
        // Handle relative URLs
        const absoluteUrl = new URL(url, baseUrl);

        // Remove common tracking parameters
        const trackingParams = [
            "utm_source",
            "utm_medium",
            "utm_campaign",
            "utm_content",
            "utm_term",
            "ref",
            "source",
        ];
        trackingParams.forEach((param) =>
            absoluteUrl.searchParams.delete(param)
        );

        return absoluteUrl.toString();
    } catch {
        return url;
    }
}

/**
 * Check if a date is after the 'since' threshold
 */
export function isAfterDate(date: Date | null, since: Date): boolean {
    if (!date) return true; // If no date, include it (might be recent)
    return date.getTime() >= since.getTime();
}
