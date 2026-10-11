import { describe, expect, it } from "vitest";
import {
	schedulingNoticeFrom,
	withSchedulingNotice,
} from "@/features/scheduling/schedulingNotice";

describe("schedulingNotice", () => {
	it("given_aNoticeCarried_when_read_then_returnsItAndKeepsTheRestOfTheState", () => {
		const state = withSchedulingNotice({ kind: "generated", name: "Week 42" })({
			key: "entry",
		} as never);

		expect(state).toEqual(expect.objectContaining({ key: "entry" }));
		expect(schedulingNoticeFrom(state)).toEqual({
			kind: "generated",
			name: "Week 42",
		});
	});

	it("given_anythingElse_when_read_then_returnsNone", () => {
		expect(schedulingNoticeFrom(undefined)).toBeUndefined();
		expect(
			schedulingNoticeFrom({ schedulingNotice: { kind: "deleted", name: "x" } })
		).toBeUndefined();
	});
});
