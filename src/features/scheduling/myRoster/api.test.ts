import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	fetchMyRoster,
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
