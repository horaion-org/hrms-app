import { describe, expect, it } from "vitest";
import type { WeekPart } from "@/features/scheduling/months/api";
import { generatedScheduleFixture } from "@/features/scheduling/schedules/fixtures";
import {
	regenerationOf,
	type RegenerationOffer,
} from "@/features/scheduling/schedules/regeneration";

/** The week of 8 Feb 2027 in three parts: Mon–Tue (s-0), Wed–Fri (s-1, on screen), Sat–Sun (s-2). */
const WEEK = { periodStart: "2027-02-08", periodEnd: "2027-02-14" };
const WEDNESDAY_TO_FRIDAY = {
	coveredFrom: "2027-02-10",
	coveredTo: "2027-02-12",
};
const WITHDRAWN_AT = "2027-02-01T09:00:00Z";

/** One part of the week, to review unless `overrides` say. */
const part = (overrides: Partial<WeekPart>): WeekPart => ({
	scheduleId: "s-1",
	name: "Week of 2027-02-08",
	named: false,
	coveredFrom: "2027-02-08",
	coveredTo: "2027-02-14",
	state: "TO_REVIEW",
	redoing: false,
	...overrides,
});

const threeParts = (lastState: WeekPart["state"]): Array<WeekPart> => [
	part({
		scheduleId: "s-0",
		coveredFrom: "2027-02-08",
		coveredTo: "2027-02-09",
	}),
	part({ scheduleId: "s-1", ...WEDNESDAY_TO_FRIDAY }),
	part({
		scheduleId: "s-2",
		coveredFrom: "2027-02-13",
		coveredTo: "2027-02-14",
		state: lastState,
	}),
];

/** A manager who may generate, on a week not passed, with the month read in. */
const MAY_GENERATE: RegenerationOffer = {
	weekPassed: false,
	monthRead: true,
	weekPublishedElsewhere: false,
	mayGenerate: true,
	mayRegenerateOncePublished: false,
};

describe("regenerationOf", () => {
	it("takes the month run for a whole week never published", () => {
		const schedule = generatedScheduleFixture({ status: "GENERATED" });

		expect(regenerationOf(schedule, [], MAY_GENERATE)).toMatchObject({
			path: "monthRun",
			offered: true,
			partOfWeek: false,
			oncePublished: false,
		});
	});

	it("takes a part's own route and names the later parts generated again after it", () => {
		const schedule = generatedScheduleFixture({
			status: "GENERATED",
			...WEEK,
			...WEDNESDAY_TO_FRIDAY,
		});

		expect(
			regenerationOf(schedule, threeParts("TO_REVIEW"), MAY_GENERATE)
		).toEqual({
			path: "ownRoute",
			offered: true,
			days: { from: "2027-02-10", to: "2027-02-12" },
			laterDays: { from: "2027-02-13", to: "2027-02-14" },
			partOfWeek: true,
			oncePublished: false,
		});
	});

	it("offers no regeneration of a part whose later part is published", () => {
		const schedule = generatedScheduleFixture({
			status: "GENERATED",
			...WEEK,
			...WEDNESDAY_TO_FRIDAY,
		});

		expect(
			regenerationOf(schedule, threeParts("PUBLISHED"), MAY_GENERATE)
		).toMatchObject({ path: "laterPartPublished", offered: false });
	});

	// The single Regenerate stays strict (API ADR-0134): only a run by dates works a withdrawn part out again.
	it("offers no regeneration of a part whose later part was published and withdrawn", () => {
		const schedule = generatedScheduleFixture({
			status: "GENERATED",
			...WEEK,
			...WEDNESDAY_TO_FRIDAY,
		});
		const [first, shown, last] = threeParts("TO_REVIEW");
		const parts = [first!, shown!, { ...last!, publishedOnce: true }];

		expect(regenerationOf(schedule, parts, MAY_GENERATE)).toMatchObject({
			path: "laterPartPublished",
			offered: false,
		});
	});

	it("takes a withdrawn part's own route, once published, for a manager who may generate it", () => {
		const schedule = generatedScheduleFixture({
			status: "GENERATED",
			...WEEK,
			...WEDNESDAY_TO_FRIDAY,
			publicationWithdrawnAt: WITHDRAWN_AT,
		});

		expect(
			regenerationOf(schedule, threeParts("TO_REVIEW"), {
				...MAY_GENERATE,
				mayGenerate: false,
				mayRegenerateOncePublished: true,
			})
		).toMatchObject({
			path: "ownRoute",
			offered: true,
			partOfWeek: true,
			oncePublished: true,
		});
	});

	it.each<[string, Partial<RegenerationOffer>]>([
		["the week has passed", { weekPassed: true }],
		["the month read is not in", { monthRead: false }],
		["the viewer may not generate", { mayGenerate: false }],
	])("offers no regeneration when %s", (_, offer) => {
		const schedule = generatedScheduleFixture({
			status: "GENERATED",
			...WEEK,
			...WEDNESDAY_TO_FRIDAY,
		});

		expect(
			regenerationOf(schedule, threeParts("TO_REVIEW"), {
				...MAY_GENERATE,
				...offer,
			}).offered
		).toBe(false);
	});
});
