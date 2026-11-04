import { timeAgo } from "@/common/relativeTime";

const RELATIVE_FOR_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * When a notification happened, as its row shows it: "5 minutes ago" up to "6 days ago", then the date.
 * Undefined means under a minute ago (or in the future), which the caller shows as "Just now".
 */
export const notificationTimeLabel = (
	occurredAt: string,
	now: Date,
	locale: string
): string | undefined => {
	const occurred = new Date(occurredAt);
	return now.getTime() - occurred.getTime() < RELATIVE_FOR_MS
		? timeAgo(occurredAt, now, locale)
		: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(occurred);
};

/** The exact date and time, for the hover title beside a relative time. */
export const notificationExactTime = (
	occurredAt: string,
	locale: string
): string =>
	new Intl.DateTimeFormat(locale, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(occurredAt));
