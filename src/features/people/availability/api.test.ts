import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	deleteMemberWeekAvailability,
	fetchMemberAvailability,
	fetchMemberWeekAvailability,
	fetchPartTimeMembersWithoutAvailability,
} from "@/features/people/availability/api";

const MEMBER = "/api/v1/companies/c-1/member-profiles/m-1/availability";
const WEEK = `${MEMBER}/weeks/2026-11-09`;

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

describe("availability API", () => {
	it("given_aPatternWithoutOverrideWeeks_when_read_then_listsNone", async () => {
		stubApi({
			[`GET ${MEMBER}`]: {
				status: 200,
				body: envelope({ membershipId: "m-1", days: [] }),
			},
		});

		await expect(fetchMemberAvailability("c-1", "m-1")).resolves.toEqual({
			membershipId: "m-1",
			days: [],
			overrideWeeks: [],
		});
	});

	it("given_aWeekWithoutAnOverride_when_read_then_answersNone", async () => {
		stubApi({ [`GET ${WEEK}`]: { status: 404 } });

		await expect(
			fetchMemberWeekAvailability("c-1", "m-1", "2026-11-09")
		).resolves.toBeNull();
	});

	it("given_aWeekAlreadyOnThePattern_when_reset_then_isDone", async () => {
		const calls = stubApi({ [`DELETE ${WEEK}`]: { status: 404 } });

		await expect(
			deleteMemberWeekAvailability("c-1", "m-1", "2026-11-09")
		).resolves.toBeUndefined();
		expect(calls.map((call) => call.method)).toEqual(["DELETE"]);
	});

	it("given_aWeek_when_readinessIsAsked_then_namesTheWeek", async () => {
		const calls = stubApi({
			"GET /api/v1/companies/c-1/branches/b-1/departments/d-1/availability-readiness":
				{
					status: 200,
					body: envelope({ partTimeMembersWithoutAvailability: [] }),
				},
		});

		await fetchPartTimeMembersWithoutAvailability(
			"c-1",
			{ branchId: "b-1", departmentId: "d-1" },
			"2026-11-09"
		);

		expect(calls[0]?.search).toBe("weekStartMonday=2026-11-09");
	});
});
