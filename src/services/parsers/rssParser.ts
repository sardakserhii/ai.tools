import { XMLParser } from "fast-xml-parser";
import type { NewsParser } from "./types.js";
import type { ParsedNewsItem, Tool } from "../../db/types.js";
import {
    fetchUrl,
    parseDate,
    cleanText,
    createSnippet,
    isAfterDate,
} from "./utils.js";

/**
 * RSS/Atom feed parser
 * Handles both RSS 2.0 and Atom feed formats
 */
export class RssParser implements NewsParser {
    name = "RSS/Atom Parser";

    private xmlParser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
    });

    canParse(url: string): boolean {
        // Check for common RSS/feed URL patterns
        const rssPatterns = [
            /\/feed\/?$/i,
            /\/rss\/?$/i,
            /\.rss$/i,
            /\.xml$/i,
            /\/atom\/?$/i,
            /feed\.xml/i,
            /rss\.xml/i,
        ];
        return rssPatterns.some((pattern) => pattern.test(url));
    }

    async parse(
        url: string,
        tool: Tool,
        since: Date
    ): Promise<ParsedNewsItem[]> {
        console.log(`[RssParser] Fetching feed: ${url}`);

        const result = await fetchUrl(url);
        if (!result.ok) {
            console.error(`[RssParser] Failed to fetch: ${result.error}`);
            return [];
        }

        try {
            const parsed = this.xmlParser.parse(result.text);

            // Try RSS 2.0 format first
            if (parsed.rss?.channel?.item) {
                return this.parseRss2(parsed.rss.channel, tool, since, url);
            }

            // Try Atom format
            if (parsed.feed?.entry) {
                return this.parseAtom(parsed.feed, tool, since, url);
            }

            console.log("[RssParser] Unknown feed format");
            return [];
        } catch (error) {
            console.error(`[RssParser] Parse error:`, error);
            return [];
        }
    }

    private parseRss2(
        channel: RssChannel,
        tool: Tool,
        since: Date,
        baseUrl: string
    ): ParsedNewsItem[] {
        const items = Array.isArray(channel.item)
            ? channel.item
            : [channel.item];
        const news: ParsedNewsItem[] = [];

        for (const item of items) {
            if (!item) continue;

            const publishedAt = parseDate(item.pubDate || item.date || "");

            if (!isAfterDate(publishedAt, since)) {
                continue;
            }

            const title = cleanText(item.title || "");
            const link = item.link || "";
            const content = item.description || item["content:encoded"] || "";
            const rawContent = cleanText(
                typeof content === "string" ? content : ""
            );

            if (title && link) {
                news.push({
                    title,
                    url: link,
                    publishedAt,
                    rawContent,
                    snippet: createSnippet(rawContent),
                });
            }
        }

        console.log(
            `[RssParser] Parsed ${news.length} items from RSS 2.0 feed`
        );
        return news;
    }

    /**
     * Extract text content from string or object with #text property
     */
    private extractTextContent(
        value: string | { "#text": string } | undefined
    ): string {
        if (!value) return "";
        if (typeof value === "string") return value;
        if (typeof value === "object" && "#text" in value)
            return value["#text"];
        return "";
    }

    private parseAtom(
        feed: AtomFeed,
        tool: Tool,
        since: Date,
        baseUrl: string
    ): ParsedNewsItem[] {
        const entries = Array.isArray(feed.entry) ? feed.entry : [feed.entry];
        const news: ParsedNewsItem[] = [];

        for (const entry of entries) {
            if (!entry) continue;

            const publishedAt = parseDate(
                entry.published || entry.updated || ""
            );

            if (!isAfterDate(publishedAt, since)) {
                continue;
            }

            const title = cleanText(
                typeof entry.title === "string"
                    ? entry.title
                    : entry.title?.["#text"] || ""
            );

            // Get link - can be string or object with href
            let link = "";
            if (typeof entry.link === "string") {
                link = entry.link;
            } else if (Array.isArray(entry.link)) {
                const htmlLink = entry.link.find(
                    (l) =>
                        l["@_type"] === "text/html" ||
                        l["@_rel"] === "alternate"
                );
                link = htmlLink?.["@_href"] || entry.link[0]?.["@_href"] || "";
            } else if (entry.link?.["@_href"]) {
                link = entry.link["@_href"];
            }

            const content =
                this.extractTextContent(entry.content) ||
                this.extractTextContent(entry.summary) ||
                "";
            const rawContent = cleanText(content);

            if (title && link) {
                news.push({
                    title,
                    url: link,
                    publishedAt,
                    rawContent,
                    snippet: createSnippet(rawContent),
                });
            }
        }

        console.log(`[RssParser] Parsed ${news.length} items from Atom feed`);
        return news;
    }
}

// Type definitions for RSS/Atom feeds
interface RssChannel {
    item: RssItem | RssItem[];
}

interface RssItem {
    title?: string;
    link?: string;
    description?: string;
    "content:encoded"?: string;
    pubDate?: string;
    date?: string;
}

interface AtomFeed {
    entry: AtomEntry | AtomEntry[];
}

interface AtomEntry {
    title?: string | { "#text": string };
    link?: string | AtomLink | AtomLink[];
    content?: string | { "#text": string };
    summary?: string | { "#text": string };
    published?: string;
    updated?: string;
}

interface AtomLink {
    "@_href"?: string;
    "@_rel"?: string;
    "@_type"?: string;
}
