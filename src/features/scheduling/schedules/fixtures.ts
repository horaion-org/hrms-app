import type { Schedule } from "@/features/scheduling/schedules/api";

/*
 * An API-shaped schedule for stories and tests; never sent anywhere. A
 * draft of "Front Office" (d-1) of "Main branch" (b-1); its shifts, read
 * on their own, are the shift fixtures (`shifts/fixtures.ts`).
 */

/** Draft s-1; `overrides` set it apart. */
export const scheduleFixture = (
	overrides: Partial<Schedule> = {}
): Schedule => ({
	scheduleId: "s-1",
	companyId: "c-1",
	branchId: "b-1",
	branchName: "Main branch",
	departmentId: "d-1",
	departmentName: "Front Office",
	name: "Front Office - Week 42",
	periodStart: "2026-10-12",
	periodEnd: "2026-10-18",
	includeLeave: true,
	allowOpenShifts: false,
	status: "DRAFT",
	createdAt: "2026-10-08T09:00:00Z",
	updatedAt: "2026-10-08T09:00:00Z",
	...overrides,
});
