import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { staffingGapFixture } from "@/features/scheduling/rulesCheck/fixtures";
import { fetchRosterRulesCheck } from "@/features/scheduling/rulesCheck/rosterRulesCheckApi";

const TARGET = {
	companyId: "c-1",
	unit: { branchId: "b-1", departmentId: "d-1" },
	scheduleId: "s-1",
	runId: "r-1",
};
const ROSTER_CHECK =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1/roster-check";

beforeEach(() => {
	configureApiClient({
		accessToken: () => Promise.resolve("test-pass"),
		renew: () => Promise.resolve({ kind: "expired" }),
		onUnauthenticated: () => {},
	});
});
afterEach(() => {
	resetApiClient();
	vi.unstubAllGlobals();
});

/** Answers the check with `data` and returns what was sent. */
const answer = (data: unknown): ReturnType<typeof stubApi> =>
	stubApi({ [`POST ${ROSTER_CHECK}`]: { status: 200, body: envelope(data) } });

describe("roster rules check client", () => {
	it("posts the revision and reads the broken rules", async () => {
		const calls = answer({
			status: "BROKEN",
			brokenRules: [
				{
					rule: "most_minutes_a_day",
					constraintId: "k-1",
					constraintName: "Twelve hours",
					violations: null,
				},
			],
			staffingGaps: [staffingGapFixture()],
		});

		const check = await fetchRosterRulesCheck(TARGET, { expectedRevision: 3 });

		expect(calls[0]?.body).toEqual({ expectedRevision: 3 });
		expect(check.status).toBe("BROKEN");
		expect(check.brokenRules[0]?.constraintName).toBe("Twelve hours");
		expect(check.staffingGaps?.[0]).toEqual(staffingGapFixture());
	});

	it("reads a status a newer API adds as not checked, never as holding", async () => {
		answer({ status: "PARTLY", brokenRules: [], staffingGaps: null });

		const check = await fetchRosterRulesCheck(TARGET, { expectedRevision: 1 });

		expect(check.status).toBe("UNCHECKED");
	});

	it("keeps staffing the engine could not work out apart from none", async () => {
		answer({ status: "HOLDS", brokenRules: [], staffingGaps: null });

		const check = await fetchRosterRulesCheck(TARGET, { expectedRevision: 1 });

		expect(check.staffingGaps).toBeNull();
	});

	it("reads who and which days, the rules not met if possible, the members they name and running short", async () => {
		answer({
			status: "BROKEN",
			brokenRules: [
				{
					rule: "most_minutes_a_day",
					constraintId: null,
					constraintName: null,
					violations: [
						{
							employeeId: "mp-1",
							date: "2026-10-16",
							days: ["2026-10-16", "2026-10-17"],
							messages: ["Over"],
						},
					],
				},
			],
			staffingGaps: [],
			notMet: [
				{
					rule: "max_consecutive_work_days",
					constraintId: null,
					constraintName: "Five in a row",
					violations: [
						{
							employeeId: "mp-1",
							date: null,
							messages: ["If possible, not met: five in a row"],
						},
					],
				},
			],
			members: [
				{ memberProfileId: "mp-1", membershipId: "m-1", displayName: "Aisha" },
			],
			mayBeShort: true,
		});

		const check = await fetchRosterRulesCheck(TARGET, { expectedRevision: 1 });

		expect(check.brokenRules[0]?.violations?.[0]).toMatchObject({
			date: "2026-10-16",
			days: ["2026-10-16", "2026-10-17"],
		});
		// A violation sent without its days (an older API, a generation's findings) reads as before.
		expect(check.notMet?.[0]?.violations?.[0]?.days).toBeUndefined();
		expect(check.notMet?.[0]?.constraintName).toBe("Five in a row");
		expect(check.members[0]?.displayName).toBe("Aisha");
		expect(check.mayBeShort).toBe(true);
	});

	it("reads an older API with none of these as not saying who, nothing not met known, and not short", async () => {
		answer({
			status: "BROKEN",
			brokenRules: [
				{
					rule: "most_minutes_a_day",
					constraintId: null,
					constraintName: null,
				},
			],
			staffingGaps: [],
		});

		const check = await fetchRosterRulesCheck(TARGET, { expectedRevision: 1 });

		expect(check.brokenRules[0]?.violations).toBeNull();
		expect(check.notMet).toBeNull();
		expect(check.members).toEqual([]);
		expect(check.mayBeShort).toBe(false);
	});
});
