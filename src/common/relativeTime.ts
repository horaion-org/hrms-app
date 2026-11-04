const UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
	{ unit: "year", seconds: 365 * 24 * 60 * 60 },
	{ unit: "month", seconds: 30 * 24 * 60 * 60 },
	{ unit: "week", seconds: 7 * 24 * 60 * 60 },
	{ unit: "day", seconds: 24 * 60 * 60 },
	{ unit: "hour", seconds: 60 * 60 },
	{ unit: "minute", seconds: 60 },
];

/**
 * "2 hours ago", "Yesterday", "5 days ago": the largest whole unit since
 * `occurredAt`, or undefined when it is under a minute ago (or in the future).
 */
export const timeAgo = (
	occurredAt: string,
	now: Date,
	locale: string
): string | undefined => {
	const elapsed = (now.getTime() - new Date(occurredAt).getTime()) / 1000;
	const match = UNITS.find(({ seconds }) => elapsed >= seconds);
	if (!match || Number.isNaN(elapsed)) return undefined;
	const text = new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
		-Math.floor(elapsed / match.seconds),
		match.unit
	);
	return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
};
