import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	fetchMyRoster,
	fetchMyRosterDays,
	myRosterDaysPath,
	myRosterPath,
} from "@/features/scheduling/myRoster/api";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";

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

describe("myRosterPath", () => {
	it("names the schedule under the caller's own routes of the company", () => {
		expect(myRosterPath("c-1", "s-1")).toBe(
			"/api/v1/companies/c-1/me/schedules/s-1"
		);
	});
});

describe("fetchMyRoster", () => {
	it("reads the schedule's week, department and roster rows", async () => {
		const assignments = scheduleAssignmentsFixture();
		stubApi({
			"GET /api/v1/companies/c-1/me/schedules/s-1": {
				status: 200,
				body: envelope({
					scheduleId: "s-1",
					name: "Front Office - Week 42",
					branchName: "North",
					departmentName: "Front Office",
					timeZone: "Asia/Singapore",
					periodStart: "2026-10-12",
					periodEnd: "2026-10-18",
					assignments,
				}),
			},
		});

		const roster = await fetchMyRoster("c-1", "s-1");

		expect(roster.departmentName).toBe("Front Office");
		expect(roster.assignments).toHaveLength(assignments.length);
	});
});

describe("myRosterDaysPath", () => {
	it("asks for the dates under the caller's own routes of the company", () => {
		expect(myRosterDaysPath("c-1", "2026-10-12", "2026-10-25")).toBe(
			"/api/v1/companies/c-1/me/roster-days?from=2026-10-12&to=2026-10-25"
		);
	});
});

describe("fetchMyRosterDays", () => {
	it("reads the rosters and the caller's own rows, each naming its roster", async () => {
		const [aishaMonday] = scheduleAssignmentsFixture();
		const calls = stubApi({
			"GET /api/v1/companies/c-1/me/roster-days": {
				status: 200,
				body: envelope({
					from: "2026-10-12",
					to: "2026-10-25",
					rosters: [
						{
							scheduleId: "s-1",
							name: "Front Office - Week 42",
							branchName: "North",
							departmentName: "Front Office",
							timeZone: "Asia/Singapore",
							coveredFrom: "2026-10-12",
							coveredTo: "2026-10-18",
						},
					],
					days: [{ scheduleId: "s-1", assignment: aishaMonday }],
				}),
			},
		});

		const answer = await fetchMyRosterDays("c-1", "2026-10-12", "2026-10-25");

		expect(calls[0]?.search).toBe("from=2026-10-12&to=2026-10-25");
		expect(answer.rosters[0]?.departmentName).toBe("Front Office");
		expect(answer.days[0]?.assignment.day).toBe("2026-10-12");
	});

	it("reads an answer with nothing found as two empty lists", async () => {
		stubApi({
			"GET /api/v1/companies/c-1/me/roster-days": {
				status: 200,
				body: envelope({
					from: "2026-10-12",
					to: "2026-10-25",
					rosters: [],
					days: [],
				}),
			},
		});

		const answer = await fetchMyRosterDays("c-1", "2026-10-12", "2026-10-25");

		expect(answer).toEqual({
			from: "2026-10-12",
			to: "2026-10-25",
			rosters: [],
			days: [],
		});
	});
});
