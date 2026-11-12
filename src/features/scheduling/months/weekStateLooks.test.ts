import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { weekStateSchema } from "@/features/scheduling/months/api";
import {
	hasRoster,
	weekAction,
	weekStateTones,
} from "@/features/scheduling/months/weekStateLooks";

const STATES = weekStateSchema.unwrap().options;

describe("weekStateTones", () => {
	it("given_everyState_when_looked_up_then_eachHasAToneAndWords", () => {
		for (const state of STATES) {
			expect(weekStateTones[state]).toBeDefined();
			expect(authTestI18n.exists(`scheduling.months.states.${state}`)).toBe(
				true
			);
		}
	});
});

describe("hasRoster", () => {
	it.each(STATES)(
		"given_%s_when_asked_then_onlyTheThreeRosterStatesHaveOne",
		(state) => {
			expect(hasRoster(state)).toBe(
				["PUBLISHED", "TO_REVIEW", "TENTATIVE"].includes(state)
			);
		}
	);
});

describe("weekAction", () => {
	it("given_theWeekUnderReview_when_asked_then_review", () => {
		expect(weekAction({ state: "TO_REVIEW", scheduleId: "s-2" })).toBe(
			"review"
		);
	});

	it.each([
		"PUBLISHED",
		"TENTATIVE",
		"GENERATING",
		"FAILED",
		"REJECTED",
		"DRAFT",
		"UNKNOWN",
	] as const)("given_%s_withASchedule_when_asked_then_open", (state) => {
		expect(weekAction({ state, scheduleId: "s-1" })).toBe("open");
	});

	it("given_aWeekWithoutASchedule_when_asked_then_noAction", () => {
		expect(weekAction({ state: "NOT_GENERATED", scheduleId: null })).toBe(
			undefined
		);
	});
});
