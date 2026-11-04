/** One choice in a time zone list, described at a fixed moment so rows don't shift while it is open. */
export type TimeZoneOption = {
	/** The IANA name, as stored, such as "Asia/Singapore". */
	value: string;
	/** "(GMT+08:00) Asia/Singapore". */
	label: string;
	/** "GMT+08:00", or "" when the browser doesn't know the zone. */
	offset: string;
	/** "14:32" in the zone, or "" when the browser doesn't know the zone. */
	localTime: string;
	/** Whether this is the viewer's own zone, which is listed first. */
	isViewerZone: boolean;
};

/** Offered when the browser can't list its zones (`Intl.supportedValuesOf` is missing or fails). */
export const FALLBACK_TIME_ZONES: ReadonlyArray<string> = [
	"Africa/Cairo",
	"Africa/Johannesburg",
	"Africa/Lagos",
	"Africa/Nairobi",
	"America/Chicago",
	"America/Denver",
	"America/Los_Angeles",
	"America/Mexico_City",
	"America/New_York",
	"America/Sao_Paulo",
	"America/Toronto",
	"Asia/Bangkok",
	"Asia/Dhaka",
	"Asia/Dubai",
	"Asia/Ho_Chi_Minh",
	"Asia/Hong_Kong",
	"Asia/Jakarta",
	"Asia/Jayapura",
	"Asia/Karachi",
	"Asia/Kolkata",
	"Asia/Kuala_Lumpur",
	"Asia/Makassar",
	"Asia/Manila",
	"Asia/Seoul",
	"Asia/Shanghai",
	"Asia/Singapore",
	"Asia/Taipei",
	"Asia/Tokyo",
	"Australia/Adelaide",
	"Australia/Brisbane",
	"Australia/Perth",
	"Australia/Sydney",
	"Europe/Berlin",
	"Europe/Istanbul",
	"Europe/London",
	"Europe/Madrid",
	"Europe/Moscow",
	"Europe/Paris",
	"Pacific/Auckland",
	"UTC",
];

const browserTimeZones = (): ReadonlyArray<string> =>
	Intl.supportedValuesOf("timeZone");

/** The zones the browser knows, or the fallback list when it can't say. */
export const availableTimeZones = (
	listTimeZones: () => ReadonlyArray<string> = browserTimeZones
): ReadonlyArray<string> => {
	try {
		const zones = listTimeZones();
		return zones.length > 0 ? zones : FALLBACK_TIME_ZONES;
	} catch {
		return FALLBACK_TIME_ZONES;
	}
};

/** The viewer's own zone, such as "Asia/Singapore", or "" when the browser doesn't say. */
export const viewerTimeZone = (): string =>
	Intl.DateTimeFormat().resolvedOptions().timeZone;

/** "America/Sao_Paulo" reads as "America/Sao Paulo". */
const displayName = (zone: string): string => zone.replace(/_/g, " ");

// Creating a formatter is the slow part (hundreds of zones), so each zone's is kept for reuse.
const formatters = new Map<string, Intl.DateTimeFormat>();

/** Formats a zone's offset and time; en-US keeps the offset in Latin "GMT±hh:mm" for every language. */
const formatterFor = (zone: string): Intl.DateTimeFormat => {
	const known = formatters.get(zone);
	if (known) return known;
	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone: zone,
		timeZoneName: "longOffset",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	});
	formatters.set(zone, formatter);
	return formatter;
};

/** The zone's offset and wall-clock time at `now`; empty when the browser doesn't know the zone. */
const describeAt = (
	zone: string,
	now: Date
): { offset: string; localTime: string } => {
	try {
		const parts = formatterFor(zone).formatToParts(now);
		const part = (type: Intl.DateTimeFormatPartTypes): string =>
			parts.find((each) => each.type === type)?.value ?? "";
		const name = part("timeZoneName");
		// Some engines write a zero offset as a bare "GMT".
		const offset = name === "GMT" ? "GMT+00:00" : name;
		return { offset, localTime: `${part("hour")}:${part("minute")}` };
	} catch {
		return { offset: "", localTime: "" };
	}
};

const toOption = (
	zone: string,
	now: Date,
	isViewerZone: boolean
): TimeZoneOption => {
	const { offset, localTime } = describeAt(zone, now);
	return {
		value: zone,
		label: offset ? `(${offset}) ${displayName(zone)}` : displayName(zone),
		offset,
		localTime,
		isViewerZone,
	};
};

/**
 * Every zone once, sorted by name (which keeps each region together), with
 * the viewer's zone first. A stored zone the list lacks is kept, so editing
 * never silently drops it.
 */
export const timeZoneOptions = ({
	zones,
	now,
	viewerZone,
	currentZone,
}: {
	zones: ReadonlyArray<string>;
	now: Date;
	viewerZone: string;
	currentZone: string;
}): Array<TimeZoneOption> => {
	const others = [...new Set([...zones, currentZone])]
		.filter((zone) => zone !== "" && zone !== viewerZone)
		.sort((a, b) => a.localeCompare(b, "en"));
	return [
		...(viewerZone ? [toOption(viewerZone, now, true)] : []),
		...others.map((zone) => toOption(zone, now, false)),
	];
};

/** "+8", "+08", "+08:00", "+0800" and "+8:00" all name GMT+08:00. */
const offsetSpellings = (offset: string): Array<string> => {
	const match = /^GMT([+-])(\d{2}):(\d{2})$/.exec(offset);
	if (!match) return [];
	const [, sign = "", hours = "", minutes = ""] = match;
	const shortHours = String(Number(hours));
	const spellings = [
		`${sign}${hours}:${minutes}`,
		`${sign}${shortHours}:${minutes}`,
		`${sign}${hours}${minutes}`,
	];
	return minutes === "00"
		? [...spellings, `${sign}${hours}`, `${sign}${shortHours}`]
		: spellings;
};

/**
 * Whether an option matches what was typed: part of its name ("singapore",
 * "new york", "asia/"), or the start of its offset ("+8", "gmt+8", "utc-3").
 */
export const matchesTimeZoneQuery = (
	option: TimeZoneOption,
	query: string
): boolean => {
	const search = query.trim().toLowerCase();
	if (search === "") return true;
	const name = displayName(option.value).toLowerCase();
	if (name.includes(displayName(search))) return true;
	const typedOffset = search.replace(/^(gmt|utc)\s*/, "").replace(/\s/g, "");
	if (!/^[+-]/.test(typedOffset)) return false;
	return offsetSpellings(option.offset).some((spelling) =>
		spelling.startsWith(typedOffset)
	);
};
