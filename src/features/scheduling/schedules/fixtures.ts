import { companyWideWorkspace } from "@/common/testing/effectiveWorkspace";
import type { Schedule } from "@/features/scheduling/schedules/api";
import type { Workspace } from "@/features/workspace/api";

/*
 * API-shaped schedules for stories and tests; never sent anywhere. A
 * draft of "Front Office" (d-1) of "Main branch" (b-1) ticking four of the
 * department's shifts and three of its constraints, which are read on their own
 * (`shifts/fixtures.ts`, `constraints/fixtures.ts`).
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
	includedShiftIds: [
		"front-desk-am",
		"breakfast-prep",
		"lunch-rush",
		"swing-shift",
	],
	includedConstraintIds: [
		"lunch-stand-ins",
		"morning-cover",
		"rest-between-shifts",
	],
	generationRequestedAt: null,
	generationRequestedBy: null,
	createdAt: "2026-10-08T09:00:00Z",
	updatedAt: "2026-10-08T09:00:00Z",
	...overrides,
});

/** Schedule s-1 once generated: frozen, with who asked and when. */
export const generatedScheduleFixture = (
	overrides: Partial<Schedule> = {}
): Schedule =>
	scheduleFixture({
		status: "GENERATION_REQUESTED",
		generationRequestedAt: "2026-10-09T10:00:00Z",
		generationRequestedBy: { membershipId: "m-c-1", displayName: "José" },
		...overrides,
	});

type Branches = Workspace["companies"][number]["branches"];

/** "Main branch" (b-1): Front Office (d-1) and Kitchen (d-2) active, Archive (d-3) inactive. */
export const SCHEDULING_BRANCHES: Branches = [
	{
		uuid: "b-1",
		name: "Main branch",
		status: "ACTIVE",
		country: "SG",
		permissions: [],
		departments: [
			{ uuid: "d-1", name: "Front Office", status: "ACTIVE", permissions: [] },
			{ uuid: "d-2", name: "Kitchen", status: "ACTIVE", permissions: [] },
			{ uuid: "d-3", name: "Archive", status: "INACTIVE", permissions: [] },
		],
	},
];

/** Company c-1's workspace with `permissions` held company-wide, as the API sends it. */
export const schedulingWorkspace = (
	permissions: ReadonlyArray<string>
): Workspace => companyWideWorkspace(permissions, SCHEDULING_BRANCHES);
