import { describe, expect, it } from "vitest";
import {
	rosterStatusBadge,
	statusLabelKey,
} from "@/features/scheduling/schedules/rosterStatus";

describe("rosterStatusBadge", () => {
	it("given_aGeneratedWeek_when_badged_then_toReviewAsOnTheMonthPage", () => {
		expect(rosterStatusBadge({ status: "GENERATED" })).toEqual({
			labelKey: "scheduling.months.states.TO_REVIEW",
			tone: "warning",
		});
	});

	it.each([
		["PUBLISHED", "success"],
		["DRAFT", "neutral"],
	] as const)("given_%s_when_badged_then_itsStatusAsToday", (status, tone) => {
		expect(rosterStatusBadge({ status })).toEqual({
			labelKey: `scheduling.overview.statuses.${status}`,
			tone,
		});
	});
});

describe("statusLabelKey", () => {
	it("given_aGeneratedSchedule_when_named_then_toReviewAsOnTheMonthPage", () => {
		expect(statusLabelKey("GENERATED")).toBe(
			"scheduling.months.states.TO_REVIEW"
		);
	});

	it.each(["DRAFT", "PUBLISHED", "GENERATION_FAILED"] as const)(
		"given_%s_when_named_then_itsOwnStatusWord",
		(status) => {
			expect(statusLabelKey(status)).toBe(
				`scheduling.overview.statuses.${status}`
			);
		}
	);
});
