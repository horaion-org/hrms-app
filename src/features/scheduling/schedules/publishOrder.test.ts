import { describe, expect, it } from "vitest";
import {
	actionWaitsForEarlierWeek,
	publishWaitsFor,
	rosterStatusBadge,
	statusLabelKey,
} from "@/features/scheduling/schedules/publishOrder";
import { generatedScheduleFixture } from "@/features/scheduling/schedules/fixtures";

describe("publishWaitsFor", () => {
	it("given_theApiNamesAnEarlierWeek_when_asked_then_thatWeek", () => {
		const schedule = generatedScheduleFixture({ status: "GENERATED" });
		const heldUp = {
			...schedule,
			publication: {
				...schedule.publication,
				waitingForWeek: { periodStart: "2026-11-09", periodEnd: "2026-11-15" },
			},
		};

		expect(publishWaitsFor(heldUp)).toEqual({
			start: "2026-11-09",
			end: "2026-11-15",
		});
	});

	it("given_noEarlierWeek_when_asked_then_undefined", () => {
		expect(publishWaitsFor(generatedScheduleFixture())).toBeUndefined();
	});
});

describe("actionWaitsForEarlierWeek", () => {
	it.each([
		["publish", true],
		["submit", true],
		["approveAndPublish", true],
		["approve", false],
		["reject", false],
		["withdrawApproval", false],
		["withdraw", false],
		["regenerate", false],
		["viewSetup", false],
		["details", false],
	] as const)("given_%s_when_asked_then_%s", (actionId, waits) => {
		expect(actionWaitsForEarlierWeek(actionId)).toBe(waits);
	});
});

describe("rosterStatusBadge", () => {
	const generated = generatedScheduleFixture({ status: "GENERATED" });
	const heldUp = {
		...generated,
		publication: {
			...generated.publication,
			waitingForWeek: { periodStart: "2026-11-09", periodEnd: "2026-11-15" },
		},
	};

	it("given_aGeneratedWeekWhosePublishWaits_when_badged_then_tentativeInTheNeutralTone", () => {
		expect(rosterStatusBadge(heldUp)).toEqual({
			labelKey: "scheduling.months.states.TENTATIVE",
			tone: "neutral",
		});
	});

	it("given_aGeneratedWeekWhosePublishDoesNotWait_when_badged_then_toReviewAsOnTheMonthPage", () => {
		expect(rosterStatusBadge(generated)).toEqual({
			labelKey: "scheduling.months.states.TO_REVIEW",
			tone: "warning",
		});
	});

	it.each([
		["PUBLISHED", "success"],
		["DRAFT", "neutral"],
	] as const)("given_%s_when_badged_then_itsStatusAsToday", (status, tone) => {
		expect(rosterStatusBadge({ ...heldUp, status })).toEqual({
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
