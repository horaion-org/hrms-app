import { describe, expect, it } from "vitest";
import {
	byDay,
	defaultEditTarget,
	draftsOf,
	effectiveWindows,
	expandDrafts,
	formatWeekStart,
	formatWindow,
	hasOverride,
	isMonday,
	isPartTime,
	isPastWeek,
	toReplaceRequest,
	validateWindows,
	weekdayOf,
	weeklyWindowsOf,
	windowsByDay,
	windowsOf,
	type WindowDraft,
} from "@/features/availability/availabilityModel";

const row = (
	days: WindowDraft["days"],
	startTime: string,
	endTime: string
): WindowDraft => ({ days, startTime, endTime });

describe("isPartTime", () => {
	it("given_eachEmploymentType_when_asked_then_onlyPartTimeIs", () => {
		expect(isPartTime("PART_TIME")).toBe(true);
		expect(isPartTime("FULL_TIME")).toBe(false);
		expect(isPartTime("CONTRACT")).toBe(false);
		expect(isPartTime(null)).toBe(false);
		expect(isPartTime("")).toBe(false);
	});
});

describe("windowsOf and byDay", () => {
	it("given_anApiAnswer_when_flattenedAndRegrouped_then_everyDayIsPresentEarliestFirst", () => {
		const windows = windowsOf({
			days: [
				{ day: "TUE", windows: [{ startTime: "09:00", endTime: "13:00" }] },
				{ day: "SUN", windows: [{ startTime: "22:00", endTime: "06:00" }] },
			],
		});

		expect(windows).toEqual([
			{ day: "TUE", startTime: "09:00", endTime: "13:00" },
			{ day: "SUN", startTime: "22:00", endTime: "06:00" },
		]);
		const days = byDay([
			...windows,
			{ day: "TUE", startTime: "07:00", endTime: "08:00" },
		]);
		expect(days.map(({ day }) => day)).toEqual([
			"MON",
			"TUE",
			"WED",
			"THU",
			"FRI",
			"SAT",
			"SUN",
		]);
		expect(days[0]?.windows).toEqual([]);
		expect(days[1]?.windows).toEqual([
			{ startTime: "07:00", endTime: "08:00" },
			{ startTime: "09:00", endTime: "13:00" },
		]);
	});
});

describe("formatWindow", () => {
	it("given_aDayWindow_when_formatted_then_joinsTheTimesWithADash", () => {
		expect(formatWindow({ startTime: "09:00", endTime: "17:00" })).toBe(
			"09:00–17:00"
		);
	});

	it("given_anOvernightWindow_when_formatted_then_showsJustItsTimes", () => {
		expect(formatWindow({ startTime: "22:00", endTime: "06:00" })).toBe(
			"22:00–06:00"
		);
	});
});

describe("draftsOf", () => {
	it("given_windowsWithTheSameTimes_when_turnedIntoRows_then_theyShareOneRow", () => {
		expect(
			draftsOf([
				{ day: "FRI", startTime: "09:00", endTime: "17:00" },
				{ day: "MON", startTime: "09:00", endTime: "17:00" },
				{ day: "MON", startTime: "18:00", endTime: "22:00" },
			])
		).toEqual([
			row(["MON", "FRI"], "09:00", "17:00"),
			row(["MON"], "18:00", "22:00"),
		]);
	});
});

describe("toReplaceRequest", () => {
	it("given_rows_when_mapped_then_sendsOneWindowPerDayRowByRowInWeekOrder", () => {
		const rows = [
			row(["FRI", "MON"], "09:00", "17:00"),
			row(["SUN"], "22:00", "06:00"),
		];

		expect(toReplaceRequest(rows)).toEqual({
			windows: [
				{ day: "MON", startTime: "09:00", endTime: "17:00" },
				{ day: "FRI", startTime: "09:00", endTime: "17:00" },
				{ day: "SUN", startTime: "22:00", endTime: "06:00" },
			],
		});
		expect(expandDrafts(rows).map(({ row: from }) => from)).toEqual([0, 0, 1]);
	});

	it("given_twoRowsOnTheSameDay_when_mapped_then_sendsBothWindows", () => {
		const rows = [
			row(["MON"], "03:00", "05:00"),
			row(["MON"], "08:00", "10:00"),
		];

		expect(toReplaceRequest(rows)).toEqual({
			windows: [
				{ day: "MON", startTime: "03:00", endTime: "05:00" },
				{ day: "MON", startTime: "08:00", endTime: "10:00" },
			],
		});
	});

	it("given_twoWindowsOnOneDay_when_turnedIntoRowsAndBack_then_bothAreKept", () => {
		const windows = [
			{ day: "MON" as const, startTime: "08:00", endTime: "10:00" },
			{ day: "MON" as const, startTime: "03:00", endTime: "05:00" },
		];

		expect(draftsOf(windows)).toEqual([
			row(["MON"], "03:00", "05:00"),
			row(["MON"], "08:00", "10:00"),
		]);
		expect(toReplaceRequest(draftsOf(windows)).windows).toHaveLength(2);
	});

	it("given_noRows_when_mapped_then_sendsAnEmptySet", () => {
		expect(toReplaceRequest([])).toEqual({ windows: [] });
	});
});

describe("validateWindows", () => {
	it("given_validRows_when_checked_then_findsNothing", () => {
		expect(
			validateWindows([
				row(["MON", "TUE"], "09:00", "13:00"),
				row(["MON"], "13:00", "17:00"),
			])
		).toEqual([]);
	});

	it("given_aRowWithoutDays_when_checked_then_asksForADay", () => {
		expect(validateWindows([row([], "09:00", "13:00")])).toEqual([
			{ row: 0, kind: "noDays" },
		]);
	});

	it("given_aRowWithoutBothTimes_when_checked_then_asksForThem", () => {
		expect(validateWindows([row(["MON"], "09:00", "")])).toEqual([
			{ row: 0, kind: "noTimes" },
		]);
	});

	it("given_aWindowEndingWhenItStarts_when_checked_then_refusesIt", () => {
		expect(validateWindows([row(["MON"], "09:00", "09:00")])).toEqual([
			{ row: 0, kind: "emptyWindow" },
		]);
	});

	it("given_fiveWindowsOnOneDay_when_checked_then_refusesTheFifth", () => {
		expect(
			validateWindows([
				row(["MON"], "06:00", "07:00"),
				row(["MON"], "08:00", "09:00"),
				row(["MON"], "10:00", "11:00"),
				row(["MON"], "12:00", "13:00"),
				row(["MON", "TUE"], "14:00", "15:00"),
			])
		).toEqual([{ row: 4, kind: "crowdedDay", day: "MON" }]);
	});

	it("given_overlappingWindowsOnOneDay_when_checked_then_refusesTheLaterRow", () => {
		expect(
			validateWindows([
				row(["WED"], "09:00", "13:00"),
				row(["WED"], "12:30", "17:00"),
			])
		).toEqual([
			{
				row: 1,
				kind: "overlap",
				overlapping: { day: "WED", startTime: "09:00", endTime: "13:00" },
			},
		]);
	});

	it("given_windowsThatOnlyTouch_when_checked_then_findsNothing", () => {
		expect(
			validateWindows([
				row(["WED"], "09:00", "13:00"),
				row(["WED"], "13:00", "17:00"),
			])
		).toEqual([]);
	});

	it("given_anOvernightWindowRunningIntoTheNextDays_when_checked_then_refusesTheOverlap", () => {
		expect(
			validateWindows([
				row(["MON"], "22:00", "06:00"),
				row(["TUE"], "05:00", "09:00"),
			])
		).toEqual([
			{
				row: 1,
				kind: "overlap",
				overlapping: { day: "MON", startTime: "22:00", endTime: "06:00" },
			},
		]);
	});

	it("given_twoSeparateWindowsOnOneDay_when_checked_then_findsNothing", () => {
		expect(
			validateWindows([
				row(["MON"], "03:00", "05:00"),
				row(["MON"], "08:00", "10:00"),
			])
		).toEqual([]);
	});

	it("given_anOvernightWindowAndALaterOneTheNextDay_when_checked_then_findsNothing", () => {
		expect(
			validateWindows([
				row(["MON"], "22:00", "06:00"),
				row(["TUE"], "08:00", "10:00"),
			])
		).toEqual([]);
	});

	it("given_anOvernightWindowAndTheNextDayStartingBeforeItEnds_when_checked_then_refusesTheOverlap", () => {
		expect(
			validateWindows([
				row(["MON"], "22:00", "06:00"),
				row(["TUE"], "05:00", "07:00"),
			])
		).toEqual([
			{
				row: 1,
				kind: "overlap",
				overlapping: { day: "MON", startTime: "22:00", endTime: "06:00" },
			},
		]);
	});

	it("given_anOvernightWindowEndingWhenTheNextStarts_when_checked_then_findsNothing", () => {
		expect(
			validateWindows([
				row(["MON"], "22:00", "06:00"),
				row(["TUE"], "06:00", "09:00"),
			])
		).toEqual([]);
	});

	it("given_sundayOvernightAndAnEarlyMonday_when_checked_then_theWeekWrapsAround", () => {
		expect(
			validateWindows([
				row(["MON"], "05:00", "09:00"),
				row(["SUN"], "23:00", "06:00"),
			])
		).toEqual([
			{
				row: 1,
				kind: "overlap",
				overlapping: { day: "MON", startTime: "05:00", endTime: "09:00" },
			},
		]);
	});

	it("given_twoSeparateMondayWindowsAndASundayOvernightRunningIntoMonday_when_checked_then_namesTheSundayWindow", () => {
		expect(
			validateWindows([
				row(["MON", "SUN"], "22:00", "04:00"),
				row(["MON"], "03:00", "05:00"),
				row(["MON"], "08:00", "10:00"),
			])
		).toEqual([
			{
				row: 1,
				kind: "overlap",
				overlapping: { day: "SUN", startTime: "22:00", endTime: "04:00" },
			},
		]);
	});

	it("given_aRowWithItsOwnProblem_when_checked_then_itIsLeftOutOfTheComparisons", () => {
		expect(
			validateWindows([
				row(["MON"], "09:00", ""),
				row(["MON"], "10:00", "11:00"),
			])
		).toEqual([{ row: 0, kind: "noTimes" }]);
	});
});

describe("isPastWeek", () => {
	it("given_aWednesday_when_compared_then_onlyEarlierWeeksArePast", () => {
		expect(isPastWeek("2026-10-26", "2026-11-04")).toBe(true);
		expect(isPastWeek("2026-11-02", "2026-11-04")).toBe(false);
		expect(isPastWeek("2026-11-09", "2026-11-04")).toBe(false);
	});

	it("given_aSunday_when_compared_then_itsOwnWeekIsNotPast", () => {
		expect(isPastWeek("2026-11-02", "2026-11-08")).toBe(false);
	});
});

describe("formatWeekStart", () => {
	it("given_aMonday_when_formatted_then_showsItsDayAndShortMonth", () => {
		expect(formatWeekStart("2026-11-10", "en-GB")).toBe("10 Nov");
	});
});

describe("hasOverride", () => {
	it("given_aWeekListedWithAnOverride_when_asked_then_onlyThatWeekHasOne", () => {
		const weeks = ["2026-11-09"];

		expect(
			hasOverride({ kind: "week", weekStartMonday: "2026-11-09" }, weeks)
		).toBe(true);
		expect(
			hasOverride({ kind: "week", weekStartMonday: "2026-11-16" }, weeks)
		).toBe(false);
		expect(hasOverride({ kind: "pattern" }, weeks)).toBe(false);
	});
});

describe("effectiveWindows", () => {
	const pattern = [
		{ day: "MON", startTime: "09:00", endTime: "17:00" },
	] as const;

	it("given_noOverride_when_resolved_then_thePatternApplies", () => {
		expect(effectiveWindows(pattern, null)).toEqual(pattern);
		expect(effectiveWindows(pattern, undefined)).toEqual(pattern);
	});

	it("given_anOverride_when_resolved_then_itReplacesThePattern", () => {
		const week = [
			{ day: "TUE", startTime: "10:00", endTime: "12:00" },
		] as const;

		expect(effectiveWindows(pattern, week)).toEqual(week);
	});

	it("given_anEmptyOverride_when_resolved_then_theWeekHasNoWindowsAtAll", () => {
		expect(effectiveWindows(pattern, [])).toEqual([]);
	});
});

describe("isMonday and weekdayOf", () => {
	it("given_aDate_when_asked_then_namesItsWeekday", () => {
		expect(isMonday("2026-11-09")).toBe(true);
		expect(isMonday("2026-11-10")).toBe(false);
		expect(weekdayOf("2026-11-09")).toBe("MON");
		expect(weekdayOf("2026-11-15")).toBe("SUN");
	});
});

describe("weeklyWindowsOf", () => {
	it("given_aWeeksDatedWindows_when_read_then_putsEachOnTheWeekdayItStarts", () => {
		expect(
			weeklyWindowsOf([
				{ date: "2026-11-09", startTime: "09:00", endTime: "13:00" },
				{ date: "2026-11-15", startTime: "22:00", endTime: "06:00" },
			])
		).toEqual([
			{ day: "MON", startTime: "09:00", endTime: "13:00" },
			{ day: "SUN", startTime: "22:00", endTime: "06:00" },
		]);
	});
});

describe("windowsByDay", () => {
	it("given_aWeeksDatedWindows_when_grouped_then_givesSevenDaysEachEarliestFirst", () => {
		const days = windowsByDay([
			{ date: "2026-11-11", startTime: "18:00", endTime: "22:00" },
			{ date: "2026-11-11", startTime: "09:00", endTime: "13:00" },
			{ date: "2026-11-15", startTime: "22:00", endTime: "06:00" },
		]);

		expect(days.map(({ day }) => day)).toEqual([
			"MON",
			"TUE",
			"WED",
			"THU",
			"FRI",
			"SAT",
			"SUN",
		]);
		expect(days[2]?.windows).toEqual([
			{ startTime: "09:00", endTime: "13:00" },
			{ startTime: "18:00", endTime: "22:00" },
		]);
		expect(days[6]?.windows).toEqual([
			{ startTime: "22:00", endTime: "06:00" },
		]);
		expect(days[0]?.windows).toEqual([]);
	});
});

describe("defaultEditTarget", () => {
	const monday = [
		{ day: "MON" as const, startTime: "09:00", endTime: "13:00" },
	];

	it("given_aWeekWithItsOwnHours_when_opened_then_editsThatWeek", () => {
		expect(defaultEditTarget(true, monday)).toBe("week");
		expect(defaultEditTarget(true, [])).toBe("week");
	});

	it("given_nothingSetAtAll_when_opened_then_editsEveryWeek", () => {
		expect(defaultEditTarget(false, [])).toBe("pattern");
	});

	it("given_aWeekOnAPattern_when_opened_then_editsThatWeek", () => {
		expect(defaultEditTarget(false, monday)).toBe("week");
	});
});
