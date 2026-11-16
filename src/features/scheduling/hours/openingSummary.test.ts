import { describe, expect, it } from "vitest";
import {
	editableMember,
	midMonthOpenings,
} from "@/features/scheduling/hours/fixtures";
import {
	lastDayBefore,
	openingWeekOf,
	startsAfterFirst,
	unknownOpeningCount,
} from "@/features/scheduling/hours/openingSummary";
import {
	monthWeekFixture,
	scheduleMonthFixture,
} from "@/features/scheduling/months/fixtures";

describe("unknownOpeningCount", () => {
	it("given_enteredRosteredAndEmptyMembers_when_counted_then_onlyTheEmptyOnesAreUnknown", () => {
		const openings = midMonthOpenings([
			editableMember("p-empty"),
			editableMember("p-locked-empty", { editable: false }),
			editableMember("p-entered", {
				workedMinutes: 4320,
				overtimeMinutes: 0,
				enteredAsOf: "2026-11-09",
			}),
			editableMember("p-rostered", { editable: false, rosteredBefore: true }),
		]);

		expect(unknownOpeningCount(openings)).toBe(2);
	});
});

describe("lastDayBefore and startsAfterFirst", () => {
	it.each([
		["2026-11-09", "2026-11-08"],
		["2026-12-01", "2026-11-30"],
	])("given_%s_when_read_then_theDayBeforeIs_%s", (asOf, dayBefore) => {
		expect(lastDayBefore(asOf)).toBe(dayBefore);
	});

	it.each([
		["2026-11-09", true],
		["2027-03-01", false],
	])("given_%s_when_read_then_startsAfterFirstIs_%s", (periodStart, after) => {
		expect(startsAfterFirst(periodStart)).toBe(after);
	});
});

describe("openingWeekOf", () => {
	it("given_aMonthWhoseFirstWeekHasNoSchedule_when_read_then_itIsTheFirstWeekWithOne", () => {
		const month = scheduleMonthFixture();
		month.weeks[0] = monthWeekFixture({
			state: "NOT_GENERATED",
			scheduleId: null,
		});

		expect(openingWeekOf(month)?.periodStart).toBe("2026-11-09");
	});

	it("given_theFirstScheduledWeekStartsOnThe1st_when_read_then_none", () => {
		const month = scheduleMonthFixture({
			month: "2027-03",
			weeks: [
				monthWeekFixture({
					periodStart: "2027-03-01",
					periodEnd: "2027-03-07",
				}),
			],
		});

		expect(openingWeekOf(month)).toBeUndefined();
	});

	it("given_noWeekHasASchedule_when_read_then_none", () => {
		const month = scheduleMonthFixture({
			weeks: [monthWeekFixture({ state: "NOT_GENERATED", scheduleId: null })],
		});

		expect(openingWeekOf(month)).toBeUndefined();
	});
});
