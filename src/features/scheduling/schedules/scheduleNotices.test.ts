import { describe, expect, it } from "vitest";
import {
	rosterShown,
	scheduleNotices,
	type ScheduleNoticeFacts,
	type ScheduleNoticeId,
} from "./scheduleNotices";

const GENERATED: ScheduleNoticeFacts = {
	status: "GENERATED",
	generating: false,
	hasRoster: true,
	weekPublishedElsewhere: false,
	weekPassed: false,
};

describe("scheduleNotices", () => {
	it.each<
		[string, Partial<ScheduleNoticeFacts>, Array<ScheduleNoticeId>, boolean]
	>([
		["a generated roster", {}, ["unpublished", "currentRules"], true],
		[
			"a generated roster whose week has passed",
			{ weekPassed: true },
			["unpublished", "weekPassed"],
			true,
		],
		[
			"a roster whose week is published elsewhere",
			{ weekPublishedElsewhere: true },
			["weekPublished", "unpublished", "currentRules"],
			true,
		],
		[
			"a rejected roster",
			{ status: "REJECTED" },
			["rejected", "currentRules"],
			true,
		],
		["a published roster", { status: "PUBLISHED" }, [], true],
		["a new run open on a roster", { generating: true }, ["generating"], false],
		[
			"a failed run",
			{ status: "GENERATION_FAILED", hasRoster: false },
			["failed", "currentRules"],
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
