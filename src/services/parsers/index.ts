/**
 * News Parsers Module
 *
 * This module provides parsers for fetching news from various AI tool websites.
 * It includes:
 * - RSS/Atom feed parser
 * - Generic HTML blog parser
 * - Custom parsers for specific sites (OpenAI, Anthropic, Google, etc.)
 */

export * from "./types.js";
export * from "./utils.js";
export { RssParser } from "./rssParser.js";
export { HtmlBlogParser } from "./htmlBlogParser.js";
export {
    OpenAIParser,
    AnthropicParser,
    GoogleBlogParser,
    MicrosoftBlogParser,
    HuggingFaceParser,
    CursorParser,
    ReplitParser,
    ElevenLabsParser,
    N8nParser,
    SunoParser,
    RunwayParser,
    PerplexityParser,
    XAIParser,
    DeepLParser,
} from "./customParsers.js";

import type { NewsParser } from "./types.js";
import { RssParser } from "./rssParser.js";
import { HtmlBlogParser } from "./htmlBlogParser.js";
import {
    OpenAIParser,
    AnthropicParser,
    GoogleBlogParser,
    MicrosoftBlogParser,
    HuggingFaceParser,
    CursorParser,
    ReplitParser,
    ElevenLabsParser,
    N8nParser,
    SunoParser,
    RunwayParser,
    PerplexityParser,
    XAIParser,
    DeepLParser,
} from "./customParsers.js";

/**
 * Get all available parsers in priority order
 * Custom parsers are checked first, then RSS, then generic HTML
 */
export function getAllParsers(): NewsParser[] {
    return [
        // Custom parsers for known sites (highest priority)
        new OpenAIParser(),
        new AnthropicParser(),
        new GoogleBlogParser(),
        new MicrosoftBlogParser(),
        new HuggingFaceParser(),
        new CursorParser(),
        new ReplitParser(),
        new ElevenLabsParser(),
        new N8nParser(),
        new SunoParser(),
        new RunwayParser(),
        new PerplexityParser(),
        new XAIParser(),
        new DeepLParser(),
        // RSS parser for feed URLs
        new RssParser(),
        // Generic HTML parser as fallback
        new HtmlBlogParser(),
    ];
}

/**
 * Find the best parser for a given URL
 */
export function findParser(url: string): NewsParser {
    const parsers = getAllParsers();

    // First, try custom parsers that explicitly match
    for (const parser of parsers) {
        if (parser.name !== "HTML Blog Parser" && parser.canParse(url)) {
            return parser;
        }
    }

    // Check if it looks like an RSS feed
    const rssParser = parsers.find((p) => p.name === "RSS/Atom Parser");
    if (rssParser && rssParser.canParse(url)) {
        return rssParser;
    }

    // Fallback to HTML parser
    return parsers.find((p) => p.name === "HTML Blog Parser")!;
}
