import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	monthWeekFixture,
	scheduleMonthFixture,
	twoPartWeekFixture,
} from "@/features/scheduling/months/fixtures";
import {
	listsWeekParts,
	rosterWeekLink,
	rosterWeeksOf,
	weekScheduleLink,
} from "@/features/scheduling/months/rosterWeeks";

// Kitchen's November: s-1 published, s-2 to review, s-3 and s-4 to review, 30 Nov without a schedule.
const NOVEMBER = scheduleMonthFixture();

describe("rosterWeeksOf", () => {
	it("given_kitchensNovember_when_listed_then_eachWeekWithItsStateAndTheMissingOneDisabled", () => {
		expect(rosterWeeksOf(NOVEMBER, authTestI18n.t)).toEqual([
			{
				start: "2026-11-02",
				end: "2026-11-08",
				state: "Published",
				disabled: false,
			},
			{
				start: "2026-11-09",
				end: "2026-11-15",
				state: "To review",
				disabled: false,
			},
			{
				start: "2026-11-16",
				end: "2026-11-22",
				state: "To review",
				disabled: false,
			},
			{
				start: "2026-11-23",
				end: "2026-11-29",
				state: "To review",
				disabled: false,
			},
			{
				start: "2026-11-30",
				end: "2026-12-06",
				state: "Not generated",
				disabled: true,
			},
		]);
	});
});

describe("rosterWeekLink", () => {
	it("given_aWeekWithARoster_when_chosen_then_itsRoster", () => {
		expect(rosterWeekLink(NOVEMBER, "2026-11-16")).toEqual({
			to: "/scheduling/$scheduleId",
			params: { scheduleId: "s-3" },
		});
	});

	it("given_aDraftWeek_when_chosen_then_itsSetup", () => {
		const month = scheduleMonthFixture({
			weeks: [monthWeekFixture({ state: "DRAFT", scheduleId: "s-8" })],
		});

		expect(rosterWeekLink(month, "2026-11-02")).toEqual({
			to: "/scheduling/new",
			search: { step: "setup", scheduleId: "s-8", departmentId: "d-1" },
		});
	});

	it("given_aWeekOfSeveralSchedulesWhoseNewestIsPublished_when_chosen_then_thePartToReviewAndItsState", () => {
		const [toReview, newest] = twoPartWeekFixture();
		const month = scheduleMonthFixture({
			weeks: [
				monthWeekFixture({
					state: "PUBLISHED",
					scheduleId: "s-2",
					parts: [toReview!, { ...newest!, state: "PUBLISHED" }],
				}),
			],
		});

		expect(rosterWeekLink(month, "2026-11-02")).toEqual({
			to: "/scheduling/$scheduleId",
			params: { scheduleId: "s-1" },
		});
		expect(rosterWeeksOf(month, authTestI18n.t)[0]?.state).toBe("To review");
	});

	it("given_aWeekWithoutASchedule_when_chosen_then_nowhere", () => {
		expect(rosterWeekLink(NOVEMBER, "2026-11-30")).toBeUndefined();
	});
});

describe("weekScheduleLink", () => {
	it.each([
		[
			"TO_REVIEW",
			{ to: "/scheduling/$scheduleId", params: { scheduleId: "s-1" } },
		],
		[
			"DRAFT",
			{
				to: "/scheduling/new",
				search: { step: "setup", scheduleId: "s-1", departmentId: "d-1" },
			},
		],
	] as const)("given_a%sSchedule_when_opened_then_goesThere", (state, link) => {
		expect(weekScheduleLink({ scheduleId: "s-1", state }, "d-1")).toEqual(link);
	});
});

describe("listsWeekParts", () => {
	it("given_twoParts_when_asked_then_listed", () => {
		expect(listsWeekParts(twoPartWeekFixture())).toBe(true);
	});

	it("given_onePartOrNone_when_asked_then_notListed", () => {
		expect(listsWeekParts(twoPartWeekFixture().slice(0, 1))).toBe(false);
		expect(listsWeekParts([])).toBe(false);
	});
});
