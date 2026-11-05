import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	fetchStartingContext,
	fetchStartingDays,
} from "@/features/scheduling/startingContext/api";
import {
	carriedWeek,
	rosterOffCell,
} from "@/features/scheduling/startingContext/fixtures";

const UNIT = { branchId: "b-1", departmentId: "d-1" };
const SCHEDULE =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1";

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

describe("starting context client", () => {
	it("reads a day kind and source this build does not know as UNKNOWN instead of failing the read", async () => {
		const week = carriedWeek();
		stubApi({
			[`GET ${SCHEDULE}/starting-days`]: {
				status: 200,
				body: envelope({
					...week,
					members: [
						{
							...week.members[0],
							cells: [
								{
									...rosterOffCell("2026-11-02"),
									kind: "TRAINING",
									source: "IMPORTED",
								},
							],
						},
					],
				}),
			},
		});

		const read = await fetchStartingDays("c-1", UNIT, "s-1");

		expect(read.members[0]?.cells[0]).toMatchObject({
			kind: "UNKNOWN",
			source: "UNKNOWN",
		});
	});

	it("reads a member's context source this build does not know as UNKNOWN", async () => {
		stubApi({
			[`GET ${SCHEDULE}/starting-context`]: {
				status: 200,
				body: envelope({
					frozen: true,
					staleMemberProfileIds: [],
					members: [
						{
							memberProfileId: "p-tan",
							displayName: "Tan Wei Ming",
							consecutiveWorkingDays: 2,
							trailingSevenDays: "OOOOOWW",
							source: "IMPORTED",
						},
					],
				}),
			},
		});

		const context = await fetchStartingContext("c-1", UNIT, "s-1");

		expect(context.members[0]?.source).toBe("UNKNOWN");
	});
});
