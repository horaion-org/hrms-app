import { describe, expect, it } from "vitest";
import {
	editableMember,
	midMonthOpenings,
} from "@/features/scheduling/hours/fixtures";
import {
	changedOpenings,
	daysBeforeOf,
	hoursText,
	initialOpeningValues,
	lockedOpeningOf,
	minutesOf,
	openingProblem,
	openingValueOf,
	withOpeningValue,
} from "@/features/scheduling/hours/openingGrid";

const EIGHT_DAYS = 8;

describe("hoursText and minutesOf", () => {
	it.each([
		[4320, "72"],
		[450, "7.5"],
		[null, ""],
	])("shows %s minutes as %j hours", (minutes, text) => {
		expect(hoursText(minutes)).toBe(text);
	});

	it.each([
		["72", 4320],
		[" 7.5 ", 450],
		["7,5", 450],
		["", null],
		["seven", undefined],
		["-1", undefined],
		["1e3", undefined],
		["0x10", undefined],
	])("reads %j as %s minutes", (text, minutes) => {
		expect(minutesOf(text)).toBe(minutes);
	});
});

describe("initialOpeningValues", () => {
	it("fills only this week's own opening, for members whose opening may be set here", () => {
		const openings = midMonthOpenings([
			editableMember("p-aisha", {
				workedMinutes: 4320,
				overtimeMinutes: 1680,
				enteredAsOf: "2026-11-09",
			}),
			editableMember("p-dan", {
				workedMinutes: 2400,
				overtimeMinutes: 0,
				enteredAsOf: "2026-11-02",
			}),
			editableMember("p-ben", { editable: false, rosteredBefore: true }),
		]);

		expect(initialOpeningValues(openings)).toEqual({
			"p-aisha": { worked: "72", overtime: "28" },
			"p-dan": { worked: "", overtime: "" },
		});
	});
});

describe("changedOpenings", () => {
	const initial = { "p-aisha": { worked: "72", overtime: "28" } };

	it("sends nothing when nothing changed", () => {
		expect(changedOpenings({}, initial)).toEqual([]);
		expect(
			changedOpenings({ "p-aisha": { worked: "72", overtime: "28" } }, initial)
		).toEqual([]);
	});

	it("sends a typed member as minutes, an empty overtime as 0, and both emptied as a clear", () => {
		let changes = withOpeningValue({}, initial, "p-ben", "worked", "40");
		changes = withOpeningValue(changes, initial, "p-aisha", "worked", "");
		changes = withOpeningValue(changes, initial, "p-aisha", "overtime", "");

		expect(changedOpenings(changes, initial)).toEqual([
			{ memberProfileId: "p-ben", workedMinutes: 2400, overtimeMinutes: 0 },
			{
				memberProfileId: "p-aisha",
				workedMinutes: null,
				overtimeMinutes: null,
			},
		]);
	});

	it("shows a member's typed value over the API's answer", () => {
		const changes = withOpeningValue({}, initial, "p-aisha", "overtime", "20");

		expect(openingValueOf(changes, initial, "p-aisha")).toEqual({
			worked: "72",
			overtime: "20",
		});
		expect(openingValueOf({}, initial, "p-aisha")).toEqual(initial["p-aisha"]);
	});
});

describe("openingProblem", () => {
	it("refuses overtime above the hours, text that isn't hours, and more than the days hold", () => {
		expect(
			openingProblem(
				{ "p-aisha": { worked: "20", overtime: "28" } },
				EIGHT_DAYS
			)
		).toBe("overtimeAboveWorked");
		expect(
			openingProblem(
				{ "p-aisha": { worked: "lots", overtime: "" } },
				EIGHT_DAYS
			)
		).toBe("invalidHours");
		expect(
			openingProblem({ "p-aisha": { worked: "193", overtime: "" } }, EIGHT_DAYS)
		).toBe("moreThanTheDaysHold");
		expect(
			openingProblem(
				{ "p-aisha": { worked: "192", overtime: "28" } },
				EIGHT_DAYS
			)
		).toBeUndefined();
	});

	it("counts the days of the month before the roster", () => {
		expect(daysBeforeOf(midMonthOpenings())).toBe(EIGHT_DAYS);
	});
});

describe("lockedOpeningOf", () => {
	it("says rosters cover the days, shows another week's figures, or nothing", () => {
		expect(
			lockedOpeningOf(editableMember("p-ben", { rosteredBefore: true }))
		).toEqual({ kind: "rostered" });
		expect(
			lockedOpeningOf(
				editableMember("p-aisha", {
					editable: false,
					workedMinutes: 4320,
					overtimeMinutes: 1680,
					enteredAsOf: "2026-11-02",
				})
			)
		).toEqual({ kind: "entered", workedMinutes: 4320, overtimeMinutes: 1680 });
		expect(
			lockedOpeningOf(editableMember("p-chen", { editable: false }))
		).toEqual({ kind: "none" });
	});
});
