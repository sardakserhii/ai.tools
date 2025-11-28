import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type { NewsParser } from "./types.js";
import type { ParsedNewsItem, Tool } from "../../db/types.js";
import {
    fetchUrl,
    parseDate,
    cleanText,
    createSnippet,
    normalizeUrl,
    isAfterDate,
} from "./utils.js";

/**
 * Custom parsers for specific sites that don't follow standard patterns
 */

/**
 * Parser for OpenAI News (ChatGPT, DALL-E, etc.)
 */
export class OpenAIParser implements NewsParser {
    name = "OpenAI News Parser";

    canParse(url: string): boolean {
        return (
            url.includes("openai.com/news") || url.includes("openai.com/blog")
        );
    }

    async parse(
        url: string,
        tool: Tool,
        since: Date
    ): Promise<ParsedNewsItem[]> {
        console.log(`[OpenAIParser] Fetching: ${url}`);
        const result = await fetchUrl(url);
        if (!result.ok) {
            console.error(`[OpenAIParser] Failed: ${result.error}`);
            return [];
        }

        const $ = cheerio.load(result.text);
        const news: ParsedNewsItem[] = [];

        // OpenAI uses various article containers
        $("a[href*='/index/']").each((_, el) => {
            const element = el as Element;
            const $a = $(element);
            const href = $a.attr("href") || "";
            const title = cleanText(
                $a.find("h3, h2, span").first().text() || $a.text()
            );

            if (!title || title.length < 10) return;

            const link = normalizeUrl(href, url);
            const dateText =
                $a.find("time, [datetime]").attr("datetime") ||
                $a.parent().find("time").text() ||
                "";
            const publishedAt = parseDate(dateText);

            if (isAfterDate(publishedAt, since)) {
                news.push({
                    title,
                    url: link,
                    publishedAt,
                    rawContent: "",
                    snippet: "",
                });
            }
        });

        console.log(`[OpenAIParser] Found ${news.length} articles`);
        return news.slice(0, 20);
    }
}

/**
 * Parser for Anthropic News (Claude)
 */
export class AnthropicParser implements NewsParser {
    name = "Anthropic News Parser";

    canParse(url: string): boolean {
        return url.includes("anthropic.com/news");
    }

    async parse(
        url: string,
        tool: Tool,
        since: Date
    ): Promise<ParsedNewsItem[]> {
        console.log(`[AnthropicParser] Fetching: ${url}`);
        const result = await fetchUrl(url);
        if (!result.ok) {
            console.error(`[AnthropicParser] Failed: ${result.error}`);
            return [];
        }

        const $ = cheerio.load(result.text);
        const news: ParsedNewsItem[] = [];
        const seenUrls = new Set<string>();

        // Anthropic uses article cards
        $("article, a[href*='/news/'], .post-card").each((_, el) => {
            const element = el as Element;
            const $el = $(element);

            const $link = $el.is("a") ? $el : $el.find("a").first();
            const href = $link.attr("href") || "";

            // Skip invalid URLs
            if (
                !href ||
                href === "#" ||
                href.startsWith("mailto:") ||
                href.startsWith("tel:")
            )
                return;

            // Must be an actual news article URL
            if (!href.includes("/news/")) return;

            const title = cleanText(
                $el.find("h2, h3, .title").first().text() || $link.text()
            );
            if (!title || title.length < 10) return;

            const link = normalizeUrl(href, url);

            // Skip duplicates
            if (seenUrls.has(link)) return;
            seenUrls.add(link);

            const dateText =
                $el.find("time, .date").text() ||
                $el.find("[datetime]").attr("datetime") ||
                "";
            const publishedAt = parseDate(dateText);
            const excerpt = cleanText($el.find("p, .excerpt").first().text());

            if (isAfterDate(publishedAt, since)) {
                news.push({
                    title,
                    url: link,
                    publishedAt,
                    rawContent: excerpt,
                    snippet: createSnippet(excerpt),
                });
            }
        });

        console.log(`[AnthropicParser] Found ${news.length} articles`);
        return news.slice(0, 20);
    }
}

/**
 * Parser for Google Blog (Gemini, AI Studio)
 */
export class GoogleBlogParser implements NewsParser {
    name = "Google Blog Parser";

    canParse(url: string): boolean {
        return url.includes("blog.google") || url.includes("googleblog.com");
    }

    async parse(
        url: string,
        tool: Tool,
        since: Date
    ): Promise<ParsedNewsItem[]> {
        console.log(`[GoogleBlogParser] Fetching: ${url}`);
        const result = await fetchUrl(url);
        if (!result.ok) {
            console.error(`[GoogleBlogParser] Failed: ${result.error}`);
            return [];
        }

        const $ = cheerio.load(result.text);
        const news: ParsedNewsItem[] = [];

        $("article, .post, [class*='article']").each((_, el) => {
            const element = el as Element;
            const $el = $(element);
            const $link = $el.find("a").first();
            const href = $link.attr("href") || "";

            if (!href) return;

            const title = cleanText($el.find("h2, h3, .title").first().text());
            if (!title || title.length < 10) return;

            const link = normalizeUrl(href, url);
            const dateText =
                $el.find("time").attr("datetime") ||
                $el.find("time, .date").text() ||
                "";
            const publishedAt = parseDate(dateText);
            const excerpt = cleanText($el.find("p").first().text());

            if (isAfterDate(publishedAt, since)) {
                news.push({
                    title,
                    url: link,
                    publishedAt,
                    rawContent: excerpt,
                    snippet: createSnippet(excerpt),
                });
            }
        });

        console.log(`[GoogleBlogParser] Found ${news.length} articles`);
        return news.slice(0, 20);
    }
}

/**
 * Parser for Microsoft Copilot Blog
 */
export class MicrosoftBlogParser implements NewsParser {
    name = "Microsoft Blog Parser";

    canParse(url: string): boolean {
        return url.includes("microsoft.com") && url.includes("blog");
    }

    async parse(
        url: string,
        tool: Tool,
        since: Date
    ): Promise<ParsedNewsItem[]> {
        console.log(`[MicrosoftBlogParser] Fetching: ${url}`);
        const result = await fetchUrl(url);
        if (!result.ok) {
            console.error(`[MicrosoftBlogParser] Failed: ${result.error}`);
            return [];
        }

        const $ = cheerio.load(result.text);
        const news: ParsedNewsItem[] = [];

        $("article, .card, [class*='post'], [class*='article']").each(
            (_, el) => {
                const element = el as Element;
                const $el = $(element);
                const $link = $el.find("a").first();
                const href = $link.attr("href") || "";

                if (!href) return;

                const title = cleanText(
                    $el.find("h2, h3, h4, .title").first().text()
                );
                if (!title || title.length < 10) return;

                const link = normalizeUrl(href, url);
                const dateText =
                    $el.find("time").attr("datetime") ||
                    $el.find("time, .date, [class*='date']").text() ||
                    "";
                const publishedAt = parseDate(dateText);
                const excerpt = cleanText(
                    $el.find("p, .excerpt").first().text()
                );

                if (isAfterDate(publishedAt, since)) {
                    news.push({
                        title,
                        url: link,
                        publishedAt,
                        rawContent: excerpt,
                        snippet: createSnippet(excerpt),
                    });
                }
            }
        );

        console.log(`[MicrosoftBlogParser] Found ${news.length} articles`);
        return news.slice(0, 20);
    }
}

/**
 * Parser for Hugging Face Blog
 */
export class HuggingFaceParser implements NewsParser {
    name = "Hugging Face Blog Parser";

    canParse(url: string): boolean {
        return url.includes("huggingface.co/blog");
    }

    async parse(
        url: string,
        tool: Tool,
        since: Date
    ): Promise<ParsedNewsItem[]> {
        console.log(`[HuggingFaceParser] Fetching: ${url}`);
        const result = await fetchUrl(url);
        if (!result.ok) {
            console.error(`[HuggingFaceParser] Failed: ${result.error}`);
            return [];
        }

        const $ = cheerio.load(result.text);
        const news: ParsedNewsItem[] = [];

        $("article, a[href*='/blog/']").each((_, el) => {
            const element = el as Element;
            const $el = $(element);

            let href = "";
            let $container = $el;

            if ($el.is("a")) {
                href = $el.attr("href") || "";
            } else {
                const $link = $el.find("a[href*='/blog/']").first();
                href = $link.attr("href") || "";
                $container = $el;
            }

            if (!href || !href.includes("/blog/")) return;

            const title = cleanText(
                $container.find("h2, h3, .title").first().text() || $el.text()
            );
            if (!title || title.length < 10 || title.length > 200) return;

            const link = normalizeUrl(href, url);
            const dateText = $container.find("time, .date").text() || "";
            const publishedAt = parseDate(dateText);
            const excerpt = cleanText($container.find("p").first().text());

            if (isAfterDate(publishedAt, since)) {
                news.push({
                    title,
                    url: link,
                    publishedAt,
                    rawContent: excerpt,
                    snippet: createSnippet(excerpt),
                });
            }
        });

        // Deduplicate by URL
        const unique = news.filter(
            (item, index, self) =>
                index === self.findIndex((t) => t.url === item.url)
        );

        console.log(`[HuggingFaceParser] Found ${unique.length} articles`);
        return unique.slice(0, 20);
    }
}

/**
 * Parser for Cursor Blog
 */
export class CursorParser implements NewsParser {
    name = "Cursor Blog Parser";

    canParse(url: string): boolean {
        return (
            url.includes("cursor.com/blog") || url.includes("cursor.sh/blog")
        );
    }

    async parse(
        url: string,
        tool: Tool,
        since: Date
    ): Promise<ParsedNewsItem[]> {
        console.log(`[CursorParser] Fetching: ${url}`);
        const result = await fetchUrl(url);
        if (!result.ok) {
            console.error(`[CursorParser] Failed: ${result.error}`);
            return [];
        }

        const $ = cheerio.load(result.text);
        const news: ParsedNewsItem[] = [];

        // Cursor blog has a specific structure
        $("a[href*='/blog/']").each((_, el) => {
            const element = el as Element;
            const $a = $(element);
            const href = $a.attr("href") || "";

            if (!href || href === "/blog/" || href === "/blog") return;

            const title = cleanText(
                $a.find("h2, h3, h4").first().text() || $a.text()
            );
            if (!title || title.length < 10 || title.length > 200) return;

            const link = normalizeUrl(href, url);
            const $parent = $a.parent();
            const dateText = $parent.find("time, .date, span").text() || "";
            const publishedAt = parseDate(dateText);
            const excerpt = cleanText($parent.find("p").first().text());

            if (isAfterDate(publishedAt, since)) {
                news.push({
                    title,
                    url: link,
                    publishedAt,
                    rawContent: excerpt,
                    snippet: createSnippet(excerpt),
                });
            }
        });

        // Deduplicate
        const unique = news.filter(
            (item, index, self) =>
                index === self.findIndex((t) => t.url === item.url)
        );

        console.log(`[CursorParser] Found ${unique.length} articles`);
        return unique.slice(0, 20);
    }
}

/**
 * Parser for Replit Blog
 */
export class ReplitParser implements NewsParser {
    name = "Replit Blog Parser";

    canParse(url: string): boolean {
        return (
            url.includes("blog.replit.com") || url.includes("replit.com/blog")
        );
    }

    async parse(
        url: string,
        tool: Tool,
        since: Date
    ): Promise<ParsedNewsItem[]> {
        console.log(`[ReplitParser] Fetching: ${url}`);
        const result = await fetchUrl(url);
        if (!result.ok) {
            console.error(`[ReplitParser] Failed: ${result.error}`);
            return [];
        }

        const $ = cheerio.load(result.text);
        const news: ParsedNewsItem[] = [];

        $("article, .post, a[href*='/blog/']").each((_, el) => {
            const element = el as Element;
            const $el = $(element);

            let href = "";
            const $container = $el;

            if ($el.is("a")) {
                href = $el.attr("href") || "";
            } else {
                const $link = $el.find("a").first();
                href = $link.attr("href") || "";
            }

            if (!href) return;

            const title = cleanText(
                $container.find("h1, h2, h3").first().text()
            );
            if (!title || title.length < 10) return;

            const link = normalizeUrl(href, url);
            const dateText = $container.find("time, .date").text() || "";
            const publishedAt = parseDate(dateText);
            const excerpt = cleanText($container.find("p").first().text());

            if (isAfterDate(publishedAt, since)) {
                news.push({
                    title,
                    url: link,
                    publishedAt,
                    rawContent: excerpt,
                    snippet: createSnippet(excerpt),
                });
            }
        });

        const unique = news.filter(
            (item, index, self) =>
                index === self.findIndex((t) => t.url === item.url)
        );

        console.log(`[ReplitParser] Found ${unique.length} articles`);
        return unique.slice(0, 20);
    }
}

/**
 * Parser for ElevenLabs Blog
 */
export class ElevenLabsParser implements NewsParser {
    name = "ElevenLabs Blog Parser";

    canParse(url: string): boolean {
        return url.includes("elevenlabs.io/blog");
    }

    async parse(
        url: string,
        tool: Tool,
        since: Date
    ): Promise<ParsedNewsItem[]> {
        console.log(`[ElevenLabsParser] Fetching: ${url}`);
        const result = await fetchUrl(url);
        if (!result.ok) {
            console.error(`[ElevenLabsParser] Failed: ${result.error}`);
            return [];
        }

        const $ = cheerio.load(result.text);
        const news: ParsedNewsItem[] = [];

        $("article, a[href*='/blog/']").each((_, el) => {
            const element = el as Element;
            const $el = $(element);

            let href = "";
            if ($el.is("a")) {
                href = $el.attr("href") || "";
            } else {
                href = $el.find("a").first().attr("href") || "";
            }

            if (!href || !href.includes("/blog/")) return;

            const title = cleanText(
                $el.find("h2, h3, h4").first().text() || $el.text()
            );
            if (!title || title.length < 10 || title.length > 200) return;

            const link = normalizeUrl(href, url);
            const dateText = $el.find("time, .date, span").text() || "";
            const publishedAt = parseDate(dateText);
            const excerpt = cleanText($el.find("p").first().text());

            if (isAfterDate(publishedAt, since)) {
                news.push({
                    title,
                    url: link,
                    publishedAt,
                    rawContent: excerpt,
                    snippet: createSnippet(excerpt),
                });
            }
        });

        const unique = news.filter(
            (item, index, self) =>
                index === self.findIndex((t) => t.url === item.url)
        );

        console.log(`[ElevenLabsParser] Found ${unique.length} articles`);
        return unique.slice(0, 20);
    }
}

/**
 * Parser for n8n Blog
 */
export class N8nParser implements NewsParser {
    name = "n8n Blog Parser";

    canParse(url: string): boolean {
        return url.includes("blog.n8n.io") || url.includes("n8n.io/blog");
    }

    async parse(
        url: string,
        tool: Tool,
        since: Date
    ): Promise<ParsedNewsItem[]> {
        console.log(`[N8nParser] Fetching: ${url}`);
        const result = await fetchUrl(url);
        if (!result.ok) {
            console.error(`[N8nParser] Failed: ${result.error}`);
            return [];
        }

        const $ = cheerio.load(result.text);
        const news: ParsedNewsItem[] = [];

        $("article").each((_, el) => {
            const element = el as Element;
            const $article = $(element);
            const $link = $article.find("a").first();
            const href = $link.attr("href") || "";

            if (!href) return;

            const title = cleanText($article.find("h2, h3").first().text());
            if (!title || title.length < 10) return;

            const link = normalizeUrl(href, url);
            const dateText =
                $article.find("time").attr("datetime") ||
                $article.find("time, .date").text() ||
                "";
            const publishedAt = parseDate(dateText);
            const excerpt = cleanText($article.find("p").first().text());

            if (isAfterDate(publishedAt, since)) {
                news.push({
                    title,
                    url: link,
                    publishedAt,
                    rawContent: excerpt,
                    snippet: createSnippet(excerpt),
                });
            }
        });

        console.log(`[N8nParser] Found ${news.length} articles`);
        return news.slice(0, 20);
    }
}

/**
 * Parser for Suno Blog
 */
export class SunoParser implements NewsParser {
    name = "Suno Blog Parser";

    canParse(url: string): boolean {
        return url.includes("suno.com/blog");
    }

    async parse(
        url: string,
        tool: Tool,
        since: Date
    ): Promise<ParsedNewsItem[]> {
        console.log(`[SunoParser] Fetching: ${url}`);
        const result = await fetchUrl(url);
        if (!result.ok) {
            console.error(`[SunoParser] Failed: ${result.error}`);
            return [];
        }

        const $ = cheerio.load(result.text);
        const news: ParsedNewsItem[] = [];

        $("article, a[href*='/blog/']").each((_, el) => {
            const element = el as Element;
            const $el = $(element);

            let href = "";
            if ($el.is("a")) {
                href = $el.attr("href") || "";
            } else {
                href = $el.find("a").first().attr("href") || "";
            }

            if (!href || href === "/blog" || href === "/blog/") return;

            const title = cleanText(
                $el.find("h2, h3").first().text() || $el.text()
            );
            if (!title || title.length < 10 || title.length > 200) return;

            const link = normalizeUrl(href, url);
            const dateText = $el.find("time, .date").text() || "";
            const publishedAt = parseDate(dateText);
            const excerpt = cleanText($el.find("p").first().text());

            if (isAfterDate(publishedAt, since)) {
                news.push({
                    title,
                    url: link,
                    publishedAt,
                    rawContent: excerpt,
                    snippet: createSnippet(excerpt),
                });
            }
        });

        const unique = news.filter(
            (item, index, self) =>
                index === self.findIndex((t) => t.url === item.url)
        );

        console.log(`[SunoParser] Found ${unique.length} articles`);
        return unique.slice(0, 20);
    }
}

/**
 * Parser for Runway Blog
 */
export class RunwayParser implements NewsParser {
    name = "Runway Blog Parser";

    canParse(url: string): boolean {
        return (
            url.includes("runwayml.com/news") ||
            url.includes("runwayml.com/blog")
        );
    }

    async parse(
        url: string,
        tool: Tool,
        since: Date
    ): Promise<ParsedNewsItem[]> {
        console.log(`[RunwayParser] Fetching: ${url}`);
        const result = await fetchUrl(url);
        if (!result.ok) {
            console.error(`[RunwayParser] Failed: ${result.error}`);
            return [];
        }

        const $ = cheerio.load(result.text);
        const news: ParsedNewsItem[] = [];

        $("article, a[href*='/news/'], a[href*='/blog/']").each((_, el) => {
            const element = el as Element;
            const $el = $(element);

            let href = "";
            if ($el.is("a")) {
                href = $el.attr("href") || "";
            } else {
                href = $el.find("a").first().attr("href") || "";
            }

            if (!href) return;

            const title = cleanText(
                $el.find("h2, h3").first().text() || $el.text()
            );
            if (!title || title.length < 10 || title.length > 200) return;

            const link = normalizeUrl(href, url);
            const dateText = $el.find("time, .date").text() || "";
            const publishedAt = parseDate(dateText);

            if (isAfterDate(publishedAt, since)) {
                news.push({
                    title,
                    url: link,
                    publishedAt,
                    rawContent: "",
                    snippet: "",
                });
            }
        });

        const unique = news.filter(
            (item, index, self) =>
                index === self.findIndex((t) => t.url === item.url)
        );

        console.log(`[RunwayParser] Found ${unique.length} articles`);
        return unique.slice(0, 20);
    }
}

/**
 * Parser for Perplexity Hub
 */
export class PerplexityParser implements NewsParser {
    name = "Perplexity Hub Parser";

    canParse(url: string): boolean {
        return (
            url.includes("perplexity.ai/hub") ||
            url.includes("perplexity.ai/blog")
        );
    }

    async parse(
        url: string,
        tool: Tool,
        since: Date
    ): Promise<ParsedNewsItem[]> {
        console.log(`[PerplexityParser] Fetching: ${url}`);
        const result = await fetchUrl(url);
        if (!result.ok) {
            console.error(`[PerplexityParser] Failed: ${result.error}`);
            return [];
        }

        const $ = cheerio.load(result.text);
        const news: ParsedNewsItem[] = [];

        $("article, a[href*='/hub/']").each((_, el) => {
            const element = el as Element;
            const $el = $(element);

            let href = "";
            if ($el.is("a")) {
                href = $el.attr("href") || "";
            } else {
                href = $el.find("a").first().attr("href") || "";
            }

            if (!href || href === "/hub" || href === "/hub/") return;

            const title = cleanText(
                $el.find("h2, h3").first().text() || $el.text()
            );
            if (!title || title.length < 10 || title.length > 200) return;

            const link = normalizeUrl(href, url);
            const dateText = $el.find("time, .date").text() || "";
            const publishedAt = parseDate(dateText);
            const excerpt = cleanText($el.find("p").first().text());

            if (isAfterDate(publishedAt, since)) {
                news.push({
                    title,
                    url: link,
                    publishedAt,
                    rawContent: excerpt,
                    snippet: createSnippet(excerpt),
                });
            }
        });

        const unique = news.filter(
            (item, index, self) =>
                index === self.findIndex((t) => t.url === item.url)
        );

        console.log(`[PerplexityParser] Found ${unique.length} articles`);
        return unique.slice(0, 20);
    }
}

/**
 * Parser for X.AI (Grok)
 */
export class XAIParser implements NewsParser {
    name = "X.AI News Parser";

    canParse(url: string): boolean {
        return url.includes("x.ai/news") || url.includes("x.ai/blog");
    }

    async parse(
        url: string,
        tool: Tool,
        since: Date
    ): Promise<ParsedNewsItem[]> {
        console.log(`[XAIParser] Fetching: ${url}`);
        const result = await fetchUrl(url);
        if (!result.ok) {
            console.error(`[XAIParser] Failed: ${result.error}`);
            return [];
        }

        const $ = cheerio.load(result.text);
        const news: ParsedNewsItem[] = [];

        $("article, a[href*='/news/'], a[href*='/blog/']").each((_, el) => {
            const element = el as Element;
            const $el = $(element);

            let href = "";
            if ($el.is("a")) {
                href = $el.attr("href") || "";
            } else {
                href = $el.find("a").first().attr("href") || "";
            }

            if (!href) return;

            const title = cleanText(
                $el.find("h2, h3").first().text() || $el.text()
            );
            if (!title || title.length < 10 || title.length > 200) return;

            const link = normalizeUrl(href, url);
            const dateText = $el.find("time, .date").text() || "";
            const publishedAt = parseDate(dateText);

            if (isAfterDate(publishedAt, since)) {
                news.push({
                    title,
                    url: link,
                    publishedAt,
                    rawContent: "",
                    snippet: "",
                });
            }
        });

        const unique = news.filter(
            (item, index, self) =>
                index === self.findIndex((t) => t.url === item.url)
        );

        console.log(`[XAIParser] Found ${unique.length} articles`);
        return unique.slice(0, 20);
    }
}

/**
 * Parser for DeepL Blog
 */
export class DeepLParser implements NewsParser {
    name = "DeepL Blog Parser";

    canParse(url: string): boolean {
        return url.includes("deepl.com") && url.includes("blog");
    }

    async parse(
        url: string,
        tool: Tool,
        since: Date
    ): Promise<ParsedNewsItem[]> {
        console.log(`[DeepLParser] Fetching: ${url}`);
        const result = await fetchUrl(url);
        if (!result.ok) {
            console.error(`[DeepLParser] Failed: ${result.error}`);
            return [];
        }

        const $ = cheerio.load(result.text);
        const news: ParsedNewsItem[] = [];

        $("article, .blog-post, a[href*='/blog/']").each((_, el) => {
            const element = el as Element;
            const $el = $(element);

            let href = "";
            if ($el.is("a")) {
                href = $el.attr("href") || "";
            } else {
                href = $el.find("a").first().attr("href") || "";
            }

            if (!href) return;

            const title = cleanText(
                $el.find("h2, h3").first().text() || $el.text()
            );
            if (!title || title.length < 10 || title.length > 200) return;

            const link = normalizeUrl(href, url);
            const dateText = $el.find("time, .date, span").text() || "";
            const publishedAt = parseDate(dateText);
            const excerpt = cleanText($el.find("p").first().text());

            if (isAfterDate(publishedAt, since)) {
                news.push({
                    title,
                    url: link,
                    publishedAt,
                    rawContent: excerpt,
                    snippet: createSnippet(excerpt),
                });
            }
        });

        const unique = news.filter(
            (item, index, self) =>
                index === self.findIndex((t) => t.url === item.url)
        );

        console.log(`[DeepLParser] Found ${unique.length} articles`);
        return unique.slice(0, 20);
    }
}
