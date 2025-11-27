/**
 * Telegram Publisher Service
 * Publishes daily digests to a Telegram channel
 */

import { config } from "../config/env.js";

/**
 * Result of publishing to Telegram
 */
export interface TelegramPublishResult {
    success: boolean;
    messageId?: number;
    error?: string;
}

/**
 * Telegram message options
 */
interface SendMessageOptions {
    chatId: string;
    text: string;
    parseMode?: "Markdown" | "MarkdownV2" | "HTML";
    disableWebPagePreview?: boolean;
    disableNotification?: boolean;
}

/**
 * Telegram API response for sendMessage
 */
interface TelegramResponse {
    ok: boolean;
    result?: {
        message_id: number;
        chat: {
            id: number;
            title?: string;
            type: string;
        };
        date: number;
        text?: string;
    };
    error_code?: number;
    description?: string;
}

/**
 * Maximum message length for Telegram (4096 characters)
 */
const MAX_MESSAGE_LENGTH = 4096;

/**
 * Convert Markdown to Telegram-compatible format
 * Telegram's Markdown parser is limited, so we need to adjust formatting
 */
function convertToTelegramMarkdown(markdown: string): string {
    let text = markdown;

    // Remove headers (###, ##, #) and just keep the text with bold
    text = text.replace(/^###\s+(.+)$/gm, "*$1*");
    text = text.replace(/^##\s+(.+)$/gm, "*$1*");
    text = text.replace(/^#\s+(.+)$/gm, "*$1*");

    // Convert bold (**text** -> *text*)
    text = text.replace(/\*\*([^*]+)\*\*/g, "*$1*");

    // Keep italic (_text_ stays _text_)

    // Convert inline code (`code` -> `code`) - already compatible

    // Remove code blocks (```...```) - just keep the content
    text = text.replace(/```[\s\S]*?```/g, (match) => {
        return match.replace(/```\w*\n?/g, "").trim();
    });

    // Convert links [text](url) -> text (url)
    // Telegram Markdown doesn't support inline links in the same way
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");

    // Remove horizontal rules
    text = text.replace(/^---+$/gm, "");

    // Clean up multiple newlines
    text = text.replace(/\n{3,}/g, "\n\n");

    return text.trim();
}

/**
 * Split long message into chunks that fit Telegram's limit
 */
function splitMessage(
    text: string,
    maxLength: number = MAX_MESSAGE_LENGTH
): string[] {
    if (text.length <= maxLength) {
        return [text];
    }

    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
        if (remaining.length <= maxLength) {
            chunks.push(remaining);
            break;
        }

        // Try to find a good break point (paragraph, sentence, or word)
        let breakPoint = remaining.lastIndexOf("\n\n", maxLength);

        if (breakPoint === -1 || breakPoint < maxLength * 0.5) {
            breakPoint = remaining.lastIndexOf("\n", maxLength);
        }

        if (breakPoint === -1 || breakPoint < maxLength * 0.5) {
            breakPoint = remaining.lastIndexOf(". ", maxLength);
            if (breakPoint !== -1) breakPoint += 1; // Include the period
        }

        if (breakPoint === -1 || breakPoint < maxLength * 0.3) {
            breakPoint = remaining.lastIndexOf(" ", maxLength);
        }

        if (breakPoint === -1) {
            breakPoint = maxLength;
        }

        chunks.push(remaining.substring(0, breakPoint).trim());
        remaining = remaining.substring(breakPoint).trim();
    }

    return chunks;
}

/**
 * Send a message to Telegram
 */
async function sendTelegramMessage(
    options: SendMessageOptions
): Promise<TelegramResponse> {
    const { telegramBotToken } = config;

    if (!telegramBotToken) {
        throw new Error("TELEGRAM_BOT_TOKEN is not configured");
    }

    const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;

    const body = {
        chat_id: options.chatId,
        text: options.text,
        parse_mode: options.parseMode || "Markdown",
        disable_web_page_preview: options.disableWebPagePreview ?? true,
        disable_notification: options.disableNotification ?? false,
    };

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    const data = (await response.json()) as TelegramResponse;

    if (!data.ok) {
        console.error("[telegram] API error:", data.description);
    }

    return data;
}

/**
 * Publish a daily digest to Telegram channel
 *
 * @param summaryMd The Telegram-ready text to publish (already formatted by LLM)
 * @param date The date of the digest (for logging)
 * @returns Result of the publish operation
 */
export async function publishToTelegram(
    summaryMd: string,
    date: string
): Promise<TelegramPublishResult> {
    console.log(`[telegram] Publishing digest for ${date}`);

    const { telegramChannelId, telegramBotToken } = config;

    // Validate configuration
    if (!telegramBotToken) {
        return {
            success: false,
            error: "TELEGRAM_BOT_TOKEN is not configured",
        };
    }

    if (!telegramChannelId) {
        return {
            success: false,
            error: "TELEGRAM_CHANNEL_ID is not configured",
        };
    }

    try {
        // The text is already Telegram-ready from the LLM
        // Just split if needed
        const chunks = splitMessage(summaryMd);

        console.log(`[telegram] Sending ${chunks.length} message(s)`);

        let lastMessageId: number | undefined;

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const isFirst = i === 0;

            // Add continuation marker for subsequent chunks
            const text = isFirst ? chunk : `_(продолжение)_\n\n${chunk}`;

            const result = await sendTelegramMessage({
                chatId: telegramChannelId,
                text,
                parseMode: "Markdown",
                disableWebPagePreview: true,
                // Only notify on first message
                disableNotification: !isFirst,
            });

            if (!result.ok) {
                // If Markdown parsing fails, try sending as plain text
                if (
                    result.error_code === 400 &&
                    result.description?.includes("parse")
                ) {
                    console.log(
                        "[telegram] Markdown parsing failed, trying plain text"
                    );
                    const plainResult = await sendTelegramMessage({
                        chatId: telegramChannelId,
                        text: text.replace(/[*_`]/g, ""), // Remove markdown formatting
                        parseMode: undefined as unknown as "Markdown",
                        disableWebPagePreview: true,
                        disableNotification: !isFirst,
                    });

                    if (!plainResult.ok) {
                        return {
                            success: false,
                            error:
                                plainResult.description ||
                                "Failed to send message",
                        };
                    }

                    lastMessageId = plainResult.result?.message_id;
                } else {
                    return {
                        success: false,
                        error: result.description || "Failed to send message",
                    };
                }
            } else {
                lastMessageId = result.result?.message_id;
            }

            // Small delay between messages to avoid rate limiting
            if (i < chunks.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
        }

        console.log(`[telegram] Successfully published digest for ${date}`);

        return {
            success: true,
            messageId: lastMessageId,
        };
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        console.error(`[telegram] Error publishing digest:`, errorMessage);

        return {
            success: false,
            error: errorMessage,
        };
    }
}

/**
 * Test the Telegram connection by sending a test message
 */
export async function testTelegramConnection(): Promise<TelegramPublishResult> {
    const { telegramChannelId, telegramBotToken } = config;

    if (!telegramBotToken || !telegramChannelId) {
        return {
            success: false,
            error: "Telegram configuration is incomplete",
        };
    }

    try {
        const result = await sendTelegramMessage({
            chatId: telegramChannelId,
            text: "🤖 *Test Message*\n\nTelegram bot is working correctly!",
            parseMode: "Markdown",
        });

        if (result.ok) {
            return {
                success: true,
                messageId: result.result?.message_id,
            };
        }

        return {
            success: false,
            error: result.description || "Failed to send test message",
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
