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
};

describe("scheduleNotices", () => {
	it.each<
		[string, Partial<ScheduleNoticeFacts>, Array<ScheduleNoticeId>, boolean]
	>([
		["a generated roster", {}, ["unpublished"], true],
		[
			"a roster whose week is published elsewhere",
			{ weekPublishedElsewhere: true },
			["weekPublished", "unpublished"],
			true,
		],
		["a rejected roster", { status: "REJECTED" }, ["rejected"], true],
		["a published roster", { status: "PUBLISHED" }, [], true],
		["a new run open on a roster", { generating: true }, ["generating"], false],
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
