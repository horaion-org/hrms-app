import { z } from "zod";

/** "yyyy-MM", January to December. */
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Whether a route's month is one the API can read, e.g. "2026-11". */
export const isMonth = (month: string): boolean => MONTH_PATTERN.test(month);

const searchSchema = z.object({
	/** The Department whose month is shown; the page names it in every link. */
	department: z.string().min(1).optional().catch(undefined),
});

export type MonthSearch = z.infer<typeof searchSchema>;

/**
 * The month page's search: the Department, required by the page and kept
 * optional here so a link without it shows the page's problem line instead
 * of failing the route.
 */
export const parseMonthSearch = (
	search: Record<string, unknown>
): MonthSearch => searchSchema.parse(search);
