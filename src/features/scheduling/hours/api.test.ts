import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	fetchOpeningBalances,
	fetchRosterHours,
	saveOpeningBalances,
} from "@/features/scheduling/hours/api";
import {
	midMonthOpenings,
	rosterHours,
} from "@/features/scheduling/hours/fixtures";

const UNIT = { branchId: "b-1", departmentId: "d-1" };
const OPENINGS =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1/opening-balances";
const HOURS =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1/hours";

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

describe("roster hours client", () => {
	it("reads each person's week and the totals", async () => {
		stubApi({
			[`GET ${HOURS}`]: { status: 200, body: envelope(rosterHours()) },
		});

		const read = await fetchRosterHours("c-1", UNIT, "s-1");

		expect(read.weekStart).toBe("2026-11-30");
		expect(read.members[0]).toEqual({
			memberProfileId: "mp-1",
			daysWorked: 6,
			normalMinutes: 2640,
			extraMinutes: 0,
			overtimeMinutes: 1680,
		});
		expect(read.totals.overtimeMinutes).toBe(1680);
	});

	it("reads the first day counted, the week's Monday from an API without it", async () => {
		stubApi({
			[`GET ${HOURS}`]: [
				{
					status: 200,
					body: envelope({ ...rosterHours(), countedFrom: "2026-12-01" }),
				},
				{
					status: 200,
					body: envelope({ ...rosterHours(), countedFrom: undefined }),
				},
			],
		});

		const part = await fetchRosterHours("c-1", UNIT, "s-1");
		const older = await fetchRosterHours("c-1", UNIT, "s-1");

		expect(part.countedFrom).toBe("2026-12-01");
		expect(older.countedFrom).toBe("2026-11-30");
	});
});
