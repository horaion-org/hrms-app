import { describe, expect, it } from "vitest";
import {
	availableTimeZones,
	FALLBACK_TIME_ZONES,
	matchesTimeZoneQuery,
	timeZoneOptions,
	type TimeZoneOption,
} from "@/components/forms/TimeZoneSelect/timeZones";

// 15 Jan 2026, 06:32 UTC: São Paulo has no daylight saving, so -03:00.
const NOW = new Date("2026-01-15T06:32:00Z");

const optionsFor = (
	zones: Array<string>,
	{ viewerZone = "", currentZone = "" } = {}
): Array<TimeZoneOption> =>
	timeZoneOptions({ zones, now: NOW, viewerZone, currentZone });

const option = (zone: string): TimeZoneOption => {
	const [found] = optionsFor([zone]);
	if (!found) throw new Error(`no option for ${zone}`);
	return found;
};

describe("availableTimeZones", () => {
	it("uses the browser's list when it has one", () => {
		expect(availableTimeZones(() => ["Asia/Singapore"])).toEqual([
			"Asia/Singapore",
		]);
	});

	it.each([
		[
			"missing",
			(): Array<string> => {
				throw new TypeError("Intl.supportedValuesOf is not a function");
			},
		],
		["empty", (): Array<string> => []],
	])("falls back to the built-in list when the browser's is %s", (_, list) => {
		expect(availableTimeZones(list)).toBe(FALLBACK_TIME_ZONES);
	});

	it("keeps the fallback list valid, sorted and including the default zone", () => {
		expect(FALLBACK_TIME_ZONES).toContain("Asia/Singapore");
		expect([...FALLBACK_TIME_ZONES]).toEqual(
			[...FALLBACK_TIME_ZONES].sort((a, b) => a.localeCompare(b, "en"))
		);
		for (const zone of FALLBACK_TIME_ZONES)
			expect(option(zone).offset).not.toBe("");
	});
});

describe("timeZoneOptions", () => {
	it.each([
		["Asia/Singapore", "(GMT+08:00) Asia/Singapore", "14:32"],
		["America/Sao_Paulo", "(GMT-03:00) America/Sao Paulo", "03:32"],
		["Asia/Kolkata", "(GMT+05:30) Asia/Kolkata", "12:02"],
		["UTC", "(GMT+00:00) UTC", "06:32"],
	])(
		"labels %s with its current offset and local time",
		(zone, label, time) => {
			expect(option(zone)).toEqual({
				value: zone,
				label,
				offset: label.slice(1, 10),
				localTime: time,
				isViewerZone: false,
			});
		}
	);

	it("sorts by name, so each region stays together", () => {
		expect(
			optionsFor([
				"Europe/London",
				"Asia/Tokyo",
				"America/Chicago",
				"Asia/Dubai",
			]).map((each) => each.value)
		).toEqual(["America/Chicago", "Asia/Dubai", "Asia/Tokyo", "Europe/London"]);
	});

	it("lists the viewer's zone first, once", () => {
		const options = optionsFor(
			["Asia/Jakarta", "Asia/Singapore", "Asia/Tokyo"],
			{
				viewerZone: "Asia/Singapore",
			}
		);
		expect(options.map((each) => [each.value, each.isViewerZone])).toEqual([
			["Asia/Singapore", true],
			["Asia/Jakarta", false],
			["Asia/Tokyo", false],
		]);
	});

	it("keeps a stored zone the browser doesn't list, so editing never drops it", () => {
		expect(
			optionsFor(["Asia/Singapore"], { currentZone: "Asia/Kolkata" }).map(
				(each) => each.value
			)
		).toEqual(["Asia/Kolkata", "Asia/Singapore"]);
	});

	it("shows a zone the browser can't format by its name alone", () => {
		expect(option("Mars/Olympus_Mons")).toEqual({
			value: "Mars/Olympus_Mons",
			label: "Mars/Olympus Mons",
			offset: "",
			localTime: "",
			isViewerZone: false,
		});
	});
});

describe("matchesTimeZoneQuery", () => {
	const singapore = option("Asia/Singapore");
	const kolkata = option("Asia/Kolkata");
	const saoPaulo = option("America/Sao_Paulo");

	it.each(["", "  ", "singapore", "SING", "asia/", "Asia/Singapore"])(
		"finds Singapore by name: %j",
		(query) => {
			expect(matchesTimeZoneQuery(singapore, query)).toBe(true);
		}
	);

	it("matches spaces typed for underscores", () => {
		expect(matchesTimeZoneQuery(saoPaulo, "sao paulo")).toBe(true);
		expect(matchesTimeZoneQuery(saoPaulo, "sao_paulo")).toBe(true);
	});

	it.each(["+8", "+08", "+08:00", "+0800", "gmt+8", "GMT +8", "utc+08"])(
		"finds Singapore by offset: %j",
		(query) => {
			expect(matchesTimeZoneQuery(singapore, query)).toBe(true);
		}
	);

	it.each(["+5:30", "+05:30", "+0530", "gmt+5:3"])(
		"finds Kolkata by a half-hour offset: %j",
		(query) => {
			expect(matchesTimeZoneQuery(kolkata, query)).toBe(true);
		}
	);

	it("tells the sign and the hour apart", () => {
		expect(matchesTimeZoneQuery(saoPaulo, "-3")).toBe(true);
		expect(matchesTimeZoneQuery(saoPaulo, "+3")).toBe(false);
		expect(matchesTimeZoneQuery(singapore, "-8")).toBe(false);
		expect(matchesTimeZoneQuery(kolkata, "+5")).toBe(true);
		expect(matchesTimeZoneQuery(kolkata, "+6")).toBe(false);
	});

	it("doesn't treat plain words or digits as an offset", () => {
		expect(matchesTimeZoneQuery(singapore, "8")).toBe(false);
		expect(matchesTimeZoneQuery(singapore, "tokyo")).toBe(false);
	});
});
