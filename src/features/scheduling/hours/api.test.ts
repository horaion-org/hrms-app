import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	fetchOpeningBalances,
	saveOpeningBalances,
} from "@/features/scheduling/hours/api";
import { midMonthOpenings } from "@/features/scheduling/hours/fixtures";

const UNIT = { branchId: "b-1", departmentId: "d-1" };
const OPENINGS =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1/opening-balances";

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

describe("opening balances client", () => {
	it("reads the month and each member's opening", async () => {
		stubApi({
			[`GET ${OPENINGS}`]: { status: 200, body: envelope(midMonthOpenings()) },
		});

		const read = await fetchOpeningBalances("c-1", UNIT, "s-1");

		expect(read.applies).toBe(true);
		expect(read.members[0]).toMatchObject({
			memberProfileId: "p-aisha",
			workedMinutes: null,
			editable: true,
		});
	});

	it("puts the typed figures as minutes under openings", async () => {
		const calls = stubApi({
			[`PUT ${OPENINGS}`]: { status: 200, body: envelope(midMonthOpenings()) },
		});

		await saveOpeningBalances("c-1", UNIT, "s-1", [
			{
				memberProfileId: "p-aisha",
				workedMinutes: 4320,
				overtimeMinutes: 1680,
			},
		]);

		expect(calls[0]?.body).toEqual({
			openings: [
				{
					memberProfileId: "p-aisha",
					workedMinutes: 4320,
					overtimeMinutes: 1680,
				},
			],
		});
	});
});
