import { describe, expect, it } from "vitest";
import { nextRosterRows } from "@/features/dashboard/nextRoster";
import type { ScheduleMonthSummary } from "@/features/scheduling/months/api";
import { readinessFixture } from "@/features/scheduling/readiness/fixtures";

const COMING_MONDAY = "2026-11-23";

/** One Department's month with the coming week in the given state. */
const summary = (
	departmentId: string,
	departmentName: string,
	state: ScheduleMonthSummary["weeks"][number]["state"]
): ScheduleMonthSummary => ({
	month: "2026-11",
	departmentId,
	departmentName,
	branchId: "b-1",
	branchName: "Main branch",
	weeks: [
		{ periodStart: "2026-11-16", state: "PUBLISHED", scheduleId: "s-past" },
		{ periodStart: COMING_MONDAY, state, scheduleId: `s-${departmentId}` },
	],
});

describe("nextRosterRows", () => {
	it("names each Department's coming week and the step it waits on, by name", () => {
		const rows = nextRosterRows(
			[
				summary("d-2", "Sales", "TO_REVIEW"),
				summary("d-1", "Bar", "PUBLISHED"),
			],
			[],
			COMING_MONDAY
		);

		expect(
			rows.map((row) => [row.departmentName, row.state, row.step])
		).toEqual([
			["Bar", "PUBLISHED", "done"],
			["Sales", "TO_REVIEW", "review"],
		]);
		expect(rows[1]?.scheduleId).toBe("s-d-2");
	});

	it("asks to generate a week no schedule names", () => {
		const rows = nextRosterRows(
			[],
			[readinessFixture({ departmentId: "d-3", departmentName: "Kitchen" })],
			COMING_MONDAY
		);

		expect(rows).toEqual([
			expect.objectContaining({
				departmentId: "d-3",
				state: "NOT_GENERATED",
				scheduleId: null,
				step: "generate",
				missing: [],
			}),
		]);
	});

	it("puts set-up first for a Department not ready to schedule", () => {
		const rows = nextRosterRows(
			[summary("d-1", "Bar", "FAILED")],
			[
				readinessFixture({
					departmentId: "d-1",
					departmentName: "Bar",
					ready: false,
					missing: ["STAFFING_CONSTRAINT"],
				}),
			],
			COMING_MONDAY
		);

		expect(rows[0]?.step).toBe("setUp");
		expect(rows[0]?.missing).toEqual(["STAFFING_CONSTRAINT"]);
	});
});
