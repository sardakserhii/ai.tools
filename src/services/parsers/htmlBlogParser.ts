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
 * Generic HTML blog parser
 * Uses common patterns to extract blog posts from HTML pages
 */
export class HtmlBlogParser implements NewsParser {
    name = "HTML Blog Parser";

    canParse(_url: string): boolean {
        // This is a fallback parser, always returns true
        return true;
    }

    async parse(
        url: string,
        tool: Tool,
        since: Date
    ): Promise<ParsedNewsItem[]> {
        console.log(`[HtmlBlogParser] Fetching: ${url}`);

        const result = await fetchUrl(url);
        if (!result.ok) {
            console.error(`[HtmlBlogParser] Failed to fetch: ${result.error}`);
            return [];
        }

        // Check if it might be RSS/XML
        if (
            result.contentType.includes("xml") ||
            result.text.trim().startsWith("<?xml")
        ) {
            console.log("[HtmlBlogParser] Content appears to be XML, skipping");
            return [];
        }

        try {
            const $ = cheerio.load(result.text);
            const news: ParsedNewsItem[] = [];

            // Try different common blog post selectors
            const selectors = this.getArticleSelectors();

            for (const selector of selectors) {
                const articles = $(selector.container);
                if (articles.length === 0) continue;

                console.log(
                    `[HtmlBlogParser] Found ${articles.length} articles with selector: ${selector.container}`
                );

                articles.each((_, el) => {
                    const element = el as Element;
                    const article = $(element);
                    const item = this.parseArticle(
                        $,
                        article,
                        selector,
                        url,
                        since
                    );
                    if (item) {
                        news.push(item);
                    }
                });

                // If we found articles, don't try other selectors
                if (news.length > 0) break;
            }

            // Limit to most recent items
            const limitedNews = news.slice(0, 20);
            console.log(
                `[HtmlBlogParser] Parsed ${limitedNews.length} articles`
            );
            return limitedNews;
        } catch (error) {
            console.error(`[HtmlBlogParser] Parse error:`, error);
            return [];
        }
    }

    private getArticleSelectors(): ArticleSelector[] {
        return [
            // Common blog patterns
            {
                container: "article",
                title: "h1, h2, h3, .title, .post-title",
                link: "a",
                date: "time, .date, .published, .post-date, [datetime]",
                content: "p, .excerpt, .summary, .description",
            },
            {
                container: ".post, .blog-post, .entry",
                title: "h1, h2, h3, .title, .post-title",
                link: "a",
                date: "time, .date, .published",
                content: "p, .excerpt, .summary",
            },
            {
                container: ".card, .news-item, .item",
                title: "h2, h3, h4, .title",
                link: "a",
                date: "time, .date, span",
                content: "p, .description",
            },
            // List-based blogs
            {
                container: "li.post, ul.posts > li, .post-list > li",
                title: "a, h2, h3",
                link: "a",
                date: "time, .date, span",
                content: "p, .excerpt",
            },
            // Grid layouts
            {
                container: ".grid-item, .col, [class*='col-']",
                title: "h2, h3, h4, .title a",
                link: "a",
                date: "time, .date",
                content: "p",
            },
        ];
    }

    private parseArticle(
        $: cheerio.CheerioAPI,
        article: cheerio.Cheerio<Element>,
        selector: ArticleSelector,
        baseUrl: string,
        since: Date
    ): ParsedNewsItem | null {
        // Extract title
        const titleEl = article.find(selector.title).first();
        const title = cleanText(titleEl.text());
        if (!title || title.length < 5) return null;

        // Extract link
        let link = "";
        const linkEl = article.find(selector.link).first();
        if (linkEl.length) {
            link = linkEl.attr("href") || "";
        }
        // Also check title element for link
        if (!link && titleEl.is("a")) {
            link = titleEl.attr("href") || "";
        }
        if (!link) {
            const parentLink = titleEl.closest("a");
            if (parentLink.length) {
                link = parentLink.attr("href") || "";
            }
        }
        if (!link) return null;

        // Normalize URL
        link = normalizeUrl(link, baseUrl);

        // Skip non-article links
        if (this.isSkipLink(link)) return null;

        // Extract date
        let publishedAt: Date | null = null;
        const dateEl = article.find(selector.date).first();
        if (dateEl.length) {
            const datetime =
                dateEl.attr("datetime") ||
                dateEl.attr("data-date") ||
                dateEl.text();
            publishedAt = parseDate(datetime);
        }

        // Check date filter
        if (!isAfterDate(publishedAt, since)) {
            return null;
        }

        // Extract content/excerpt
        const contentEl = article.find(selector.content).first();
        const rawContent = cleanText(contentEl.text() || "");

        return {
            title,
            url: link,
            publishedAt,
            rawContent,
            snippet: createSnippet(rawContent),
        };
    }

    private isSkipLink(url: string): boolean {
        const skipPatterns = [
            /\/tag\//i,
            /\/category\//i,
            /\/author\//i,
            /\/page\/\d+/i,
            /#comments?$/i,
            /\/search\?/i,
            /javascript:/i,
            /mailto:/i,
        ];
        return skipPatterns.some((pattern) => pattern.test(url));
    }
}

interface ArticleSelector {
    container: string;
    title: string;
    link: string;
    date: string;
    content: string;
}
