import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	fetchDaysOff,
	fetchShortages,
	fetchTeamCoverOffers,
	searchOf,
} from "@/features/dashboard/api";
import {
	dayOffFixture,
	shortageFixture,
	teamCoverOfferFixture,
} from "@/features/dashboard/fixtures";

const SCHEDULES = "/api/v1/companies/c-1/schedules";
const WEEK = { from: "2026-11-16", to: "2026-11-29" };

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

describe("dashboard reads", () => {
	it("names the range, then the branch and the department only when set", () => {
		expect(searchOf({}, WEEK)).toBe("?from=2026-11-16&to=2026-11-29");
		expect(searchOf({ branchId: "b-1" })).toBe("?branchId=b-1");
		expect(searchOf({})).toBe("");
		expect(searchOf({ branchId: "b-1", departmentId: "d-1" }, WEEK)).toBe(
			"?from=2026-11-16&to=2026-11-29&branchId=b-1&departmentId=d-1"
		);
	});

	it("reads the shifts short in the range", async () => {
		const calls = stubApi({
			[`GET ${SCHEDULES}/shortages`]: {
				status: 200,
				body: envelope({ ...WEEK, shortages: [shortageFixture()] }),
			},
		});

		const shortages = await fetchShortages("c-1", { branchId: "b-1" }, WEEK);

		expect(shortages).toEqual([shortageFixture()]);
		expect(calls[0]?.search).toBe("from=2026-11-16&to=2026-11-29&branchId=b-1");
	});

	it("reads the rostered days off in the range", async () => {
		stubApi({
			[`GET ${SCHEDULES}/days-off`]: {
				status: 200,
				body: envelope({ ...WEEK, daysOff: [dayOffFixture()] }),
			},
		});

		await expect(fetchDaysOff("c-1", {}, WEEK)).resolves.toEqual([
			dayOffFixture(),
		]);
	});

	it("reads the open cover offers in the units", async () => {
		stubApi({
			[`GET ${SCHEDULES}/cover-offers`]: {
				status: 200,
				body: envelope({ offers: [teamCoverOfferFixture()] }),
			},
		});

		await expect(fetchTeamCoverOffers("c-1", {})).resolves.toEqual([
			teamCoverOfferFixture(),
		]);
	});
});
