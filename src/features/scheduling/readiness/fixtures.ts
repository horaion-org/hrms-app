import type { SchedulingReadiness } from "@/features/scheduling/readiness/api";

/*
 * API-shaped readiness rows for stories and tests; never sent anywhere.
 * The default is Orchard's Kitchen (d-1), ready to schedule.
 */

/** One department's readiness; ready Kitchen unless overridden. */
export const readinessFixture = (
	overrides: Partial<SchedulingReadiness> = {}
): SchedulingReadiness => ({
	departmentId: "d-1",
	departmentName: "Kitchen",
	branchId: "b-1",
	branchName: "Orchard",
	ready: true,
	missing: [],
	...overrides,
});
