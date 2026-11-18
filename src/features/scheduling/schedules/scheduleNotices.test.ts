import { describe, expect, it } from "vitest";
import { generatedScheduleFixture } from "@/features/scheduling/schedules/fixtures";
import {
	rosterShown,
	scheduleNoticeFactsOf,
	scheduleNotices,
	type ScheduleNoticeFacts,
	type ScheduleNoticeId,
	type ScheduleWeekFacts,
} from "./scheduleNotices";

const GENERATED: ScheduleNoticeFacts = {
	status: "GENERATED",
	generating: false,
	hasRoster: true,
	newestRunFailed: false,
	weekPublishedElsewhere: false,
	weekPassed: false,
	rulesChanged: false,
	laterPartPublished: false,
};

describe("scheduleNotices", () => {
	it.each<
		[string, Partial<ScheduleNoticeFacts>, Array<ScheduleNoticeId>, boolean]
	>([
		["a generated roster", {}, ["unpublished"], true],
		[
			"a generated roster whose rules changed since",
			{ rulesChanged: true },
			["unpublished", "rulesChanged"],
			true,
		],
		[
			"a roster whose rules changed and whose week has passed",
			{ rulesChanged: true, weekPassed: true },
			["unpublished", "weekPassed"],
			true,
		],
		[
			"a generated roster whose week has passed",
			{ weekPassed: true },
			["unpublished", "weekPassed"],
			true,
		],
		[
			"a part whose later part is published",
			{ laterPartPublished: true },
			["unpublished", "laterPartPublished"],
			true,
		],
		[
			"a roster whose week is published elsewhere",
			{ weekPublishedElsewhere: true },
			["weekPublished", "unpublished"],
			true,
		],
		[
			"a generated roster whose regeneration failed",
			{ newestRunFailed: true },
			["regenerationFailed", "unpublished"],
			true,
		],
		[
			"a new run open on a roster whose last run failed",
			{ generating: true, newestRunFailed: true },
			["generating"],
			false,
		],
		["a rejected roster", { status: "REJECTED" }, ["rejected"], true],
		["a published roster", { status: "PUBLISHED" }, [], true],
		[
			"a new run open on a roster whose rules changed",
			{ generating: true, rulesChanged: true },
			["generating"],
			false,
		],
		[
			"a failed run",
			{ status: "GENERATION_FAILED", hasRoster: false },
			["failed"],
			false,
		],
		["a draft", { status: "DRAFT", hasRoster: false }, ["draft"], false],
	])(
		"on %s shows only what asks for action, and the roster when there is one",
		(_, facts, notices, shown) => {
			const all = { ...GENERATED, ...facts };

			expect(scheduleNotices(all)).toEqual(notices);
			expect(rosterShown(all)).toBe(shown);
		}
	);
});

describe("scheduleNoticeFactsOf", () => {
	/** Nothing known of the week: no month read yet. */
	const UNKNOWN_WEEK: ScheduleWeekFacts = {
		weekPublishedElsewhere: false,
		weekPassed: false,
		laterPartPublished: false,
		monthWeeks: undefined,
	};

	it("reads a generated roster's own standing", () => {
		expect(
			scheduleNoticeFactsOf(
				generatedScheduleFixture({ status: "GENERATED" }),
				UNKNOWN_WEEK
			)
		).toEqual(GENERATED);
	});

	it("reads a roster still generating, with no roster yet", () => {
		expect(
			scheduleNoticeFactsOf(
				generatedScheduleFixture({ status: "GENERATION_REQUESTED" }),
				UNKNOWN_WEEK
			)
		).toMatchObject({ generating: true, hasRoster: false });
	});

	it("passes on what is known of the week", () => {
		expect(
			scheduleNoticeFactsOf(generatedScheduleFixture({ status: "GENERATED" }), {
				...UNKNOWN_WEEK,
				weekPublishedElsewhere: true,
				weekPassed: true,
			})
		).toMatchObject({ weekPublishedElsewhere: true, weekPassed: true });
	});

	it.each<[string, ScheduleWeekFacts["monthWeeks"], boolean]>([
		["its own week says so", [{ scheduleId: "s-1", rulesChanged: true }], true],
		[
			"only another schedule's week says so",
			[
				{ scheduleId: "s-2", rulesChanged: true },
				{ scheduleId: "s-1", rulesChanged: false },
			],
			false,
		],
		[
			"the month read has no answer",
			[{ scheduleId: "s-1", rulesChanged: null }],
			false,
		],
		["the month is not read yet", undefined, false],
	])("says the rules changed only when %s", (_, monthWeeks, rulesChanged) => {
		expect(
			scheduleNoticeFactsOf(generatedScheduleFixture({ status: "GENERATED" }), {
				...UNKNOWN_WEEK,
				monthWeeks,
			}).rulesChanged
		).toBe(rulesChanged);
	});
});
