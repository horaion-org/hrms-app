import { describe, expect, it } from "vitest";
import { scheduleBodyOf } from "@/features/scheduling/schedules/scheduleBody";

describe("scheduleBodyOf", () => {
	it("given_aSetupAndTicks_when_sent_then_theSetupWithoutItsDepartmentAndEveryTick", () => {
		expect(
			scheduleBodyOf(
				{
					departmentId: "d-1",
					name: "Week of 2026-12-07",
					periodStart: "2026-12-07",
					includeLeave: false,
				},
				["sh-1", "sh-2"],
				["c-1"]
			)
		).toStrictEqual({
			name: "Week of 2026-12-07",
			periodStart: "2026-12-07",
			includeLeave: false,
			includedShiftIds: ["sh-1", "sh-2"],
			includedConstraintIds: ["c-1"],
		});
	});

	it("given_nothingTicked_when_sent_then_emptyListsNotLeftOut", () => {
		expect(
			scheduleBodyOf(
				{
					departmentId: "d-1",
					name: "Kitchen",
					periodStart: "2026-12-07",
					includeLeave: true,
				},
				[],
				[]
			)
		).toStrictEqual({
			name: "Kitchen",
			periodStart: "2026-12-07",
			includeLeave: true,
			includedShiftIds: [],
			includedConstraintIds: [],
		});
	});
});
