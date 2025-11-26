import dayjs from "dayjs";

/**
 * Format a date as YYYY-MM-DD (ISO date format for DB)
 */
export function formatDateISO(date: Date): string {
    return dayjs(date).format("YYYY-MM-DD");
}

/**
 * Get yesterday's date
 */
export function getYesterday(): Date {
    return dayjs().subtract(1, "day").toDate();
}

/**
 * Get today's date at start of day (UTC)
 */
export function getTodayStart(): Date {
    return dayjs().startOf("day").toDate();
}

/**
 * Get start of day for a given date (UTC)
 */
export function getStartOfDay(date: Date): Date {
    return dayjs(date).startOf("day").toDate();
}

/**
 * Get end of day for a given date (UTC)
 */
export function getEndOfDay(date: Date): Date {
    return dayjs(date).endOf("day").toDate();
}

/**
 * Parse a date string (YYYY-MM-DD) to Date object
 */
export function parseDate(dateStr: string): Date {
    return dayjs(dateStr).toDate();
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
    return dayjs(date).isSame(dayjs(), "day");
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date): boolean {
    return dayjs(date).isBefore(dayjs(), "day");
}

/**
 * Format date for display
 */
export function formatDateDisplay(date: Date): string {
    return dayjs(date).format("MMMM D, YYYY");
}

/**
 * Get date N days ago
 */
export function getDaysAgo(days: number): Date {
    return dayjs().subtract(days, "day").toDate();
}
