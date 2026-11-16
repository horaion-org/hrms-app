import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	fetchMyPreferenceWeek,
	fetchTeamPreferences,
	myPreferenceWeekKey,
	replaceMyPreferenceDay,
	TEAM_PAGE_SIZE,
	teamPreferencesKey,
	teamPreferencesPath,
} from "@/features/shiftPreferences/api";
import {
	FIXTURE_WEEK,
	fixtureTeamPage,
	fixtureWeek,
	MONDAY_WITH_MORNING,
} from "@/features/shiftPreferences/fixtures";

const MINE = "/api/v1/companies/c-1/me/shift-preferences";

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

describe("shift preferences API", () => {
	it("given_aWeek_when_theCallersOwnIsRead_then_asksTheSelfRouteForThatMonday", async () => {
		const calls = stubApi({
			[`GET ${MINE}`]: { status: 200, body: envelope(fixtureWeek()) },
		});

		await expect(fetchMyPreferenceWeek("c-1", FIXTURE_WEEK)).resolves.toEqual(
			fixtureWeek()
		);
		expect(calls[0]?.search).toBe(`weekStartMonday=${FIXTURE_WEEK}`);
	});

	it("given_aDay_when_replaced_then_putsItsShiftIdsAndReadsTheDayBack", async () => {
		const calls = stubApi({
			[`PUT ${MINE}/days/${FIXTURE_WEEK}`]: {
				status: 200,
				body: envelope(MONDAY_WITH_MORNING),
			},
		});

		await expect(
			replaceMyPreferenceDay("c-1", FIXTURE_WEEK, ["s-morning"])
		).resolves.toEqual(MONDAY_WITH_MORNING);
		expect(calls[0]?.body).toEqual({ shiftIds: ["s-morning"] });
	});

	it("given_noShifts_when_aDayIsReplaced_then_sendsAnEmptySetToClearIt", async () => {
		const calls = stubApi({
			[`PUT ${MINE}/days/${FIXTURE_WEEK}`]: {
				status: 200,
				body: envelope({ ...MONDAY_WITH_MORNING, shifts: [] }),
			},
		});

		await replaceMyPreferenceDay("c-1", FIXTURE_WEEK, []);

		expect(calls[0]?.body).toEqual({ shiftIds: [] });
	});

	it("given_aDepartmentWeekAndPage_when_theTeamListIsAsked_then_namesEachWithThePageSize", () => {
		expect(
			teamPreferencesPath("c-1", {
				departmentId: "d-1",
				weekStartMonday: FIXTURE_WEEK,
				page: 2,
			})
		).toBe(
			`/api/v1/companies/c-1/shift-preferences?departmentId=d-1&weekStartMonday=${FIXTURE_WEEK}&page=2&size=${TEAM_PAGE_SIZE}`
		);
	});

	it("given_aTeamPage_when_read_then_parsesTheMembersAndTotal", async () => {
		stubApi({
			"GET /api/v1/companies/c-1/shift-preferences": {
				status: 200,
				body: envelope(fixtureTeamPage()),
			},
		});

		await expect(
			fetchTeamPreferences("c-1", {
				departmentId: "d-1",
				weekStartMonday: FIXTURE_WEEK,
				page: 0,
			})
		).resolves.toEqual(fixtureTeamPage());
	});

	it("given_anOwnWeekAndATeamPage_when_keyed_then_eachHasItsOwnStableKey", () => {
		expect(myPreferenceWeekKey("c-1", FIXTURE_WEEK)).toEqual([
			"shiftPreferences",
			"c-1",
			"me",
			FIXTURE_WEEK,
		]);
		expect(
			teamPreferencesKey("c-1", {
				departmentId: "d-1",
				weekStartMonday: FIXTURE_WEEK,
				page: 0,
			})
		).toEqual(["shiftPreferences", "c-1", "team", "d-1", FIXTURE_WEEK, 0]);
	});
});
