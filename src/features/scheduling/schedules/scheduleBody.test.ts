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

	const setup = {
		departmentId: "d-1",
		name: "Year-end gala",
		periodStart: "2026-11-16",
		includeLeave: true,
	};
	const savedDraft = {
		periodStart: "2026-11-16",
		periodEnd: "2026-11-22",
		coveredFrom: "2026-11-19",
		coveredTo: "2026-11-22",
		memberProfileIds: ["m-1", "m-2"],
	};

	it.each([
		{
			case: "a chosen-people part keeps its people and its days",
			draft: savedDraft,
			setupWeek: "2026-11-16",
			keeps: {
				coveredFrom: "2026-11-19",
				coveredTo: "2026-11-22",
				memberProfileIds: ["m-1", "m-2"],
			},
		},
		{
			case: "an everyone whole-week draft sends neither",
			draft: {
				...savedDraft,
				coveredFrom: "2026-11-16",
				memberProfileIds: null,
			},
			setupWeek: "2026-11-16",
			keeps: {},
		},
		{
			case: "a draft moved to another week keeps its people, not its old days",
			draft: savedDraft,
			setupWeek: "2026-11-23",
			keeps: { memberProfileIds: ["m-1", "m-2"] },
		},
		{
			case: "no saved draft sends neither",
			draft: undefined,
			setupWeek: "2026-11-16",
			keeps: {},
		},
	])("given_$case", ({ draft, setupWeek, keeps }) => {
		expect(
			scheduleBodyOf(
				{ ...setup, periodStart: setupWeek },
				["sh-1"],
				["c-1"],
				draft
			)
		).toStrictEqual({
			name: "Year-end gala",
			periodStart: setupWeek,
			includeLeave: true,
			includedShiftIds: ["sh-1"],
			includedConstraintIds: ["c-1"],
			...keeps,
		});
	});
});
