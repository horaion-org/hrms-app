import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	fetchStartingContext,
	fetchStartingDays,
	saveStartingDays,
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

	it("reads a day off's type as sent, and one from an older API as none", async () => {
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
								{ ...rosterOffCell("2026-11-02"), dayType: "REST" },
								// undefined leaves the key out of the JSON, as an older API sends it.
								{ ...rosterOffCell("2026-11-03"), dayType: undefined },
							],
						},
					],
				}),
			},
		});

		const read = await fetchStartingDays("c-1", UNIT, "s-1");

		expect(read.members[0]?.cells.map((cell) => cell.dayType)).toEqual([
			"REST",
			null,
		]);
	});

	it("sends an entered day off with its type", async () => {
		const calls = stubApi({
			[`PUT ${SCHEDULE}/starting-days`]: {
				status: 200,
				body: envelope(carriedWeek()),
			},
		});

		await saveStartingDays("c-1", UNIT, "s-1", [
			{
				memberProfileId: "p-siti",
				date: "2026-11-06",
				kind: "OFF",
				shiftId: null,
				dayType: "REST",
			},
		]);

		expect(calls[0]?.body).toEqual({
			days: [
				{
					memberProfileId: "p-siti",
					date: "2026-11-06",
					kind: "OFF",
					shiftId: null,
					dayType: "REST",
				},
			],
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
