import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	fetchMemberPreferenceWeek,
	fetchMyPreferenceWeek,
	fetchTeamPreferences,
	memberPreferenceWeekKey,
	myPreferenceWeekKey,
	replaceMemberPreferenceDay,
	replaceMyPreferenceDay,
	TEAM_PAGE_SIZE,
	teamPagesAfterFirst,
	teamPreferencesKey,
	teamPreferencesPath,
	teamPreferencesQuery,
	teamPreferencesRoot,
} from "@/features/shiftPreferences/api";
import {
	FIXTURE_WEEK,
	fixtureTeamPage,
	fixtureTeamPageWithFormerMember,
	fixtureWeek,
	MONDAY_WITH_MORNING,
} from "@/features/shiftPreferences/fixtures";

const MINE = "/api/v1/companies/c-1/me/shift-preferences";
const MEMBER = "/api/v1/companies/c-1/member-profiles/m-1/shift-preferences";

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

	it("given_aMemberAndWeek_when_theirWeekIsRead_then_asksTheMembersRouteForThatMondayAndParsesIt", async () => {
		const calls = stubApi({
			[`GET ${MEMBER}/weeks/${FIXTURE_WEEK}`]: {
				status: 200,
				body: envelope(fixtureWeek()),
			},
		});

		await expect(
			fetchMemberPreferenceWeek("c-1", "m-1", FIXTURE_WEEK)
		).resolves.toEqual(fixtureWeek());
		expect(calls[0]?.search).toBe("");
	});

	it("given_aMembersDay_when_replaced_then_putsItsShiftIdsToTheMembersRouteAndReadsTheDayBack", async () => {
		const calls = stubApi({
			[`PUT ${MEMBER}/days/${FIXTURE_WEEK}`]: {
				status: 200,
				body: envelope(MONDAY_WITH_MORNING),
			},
		});

		await expect(
			replaceMemberPreferenceDay("c-1", "m-1", FIXTURE_WEEK, ["s-morning"])
		).resolves.toEqual(MONDAY_WITH_MORNING);
		expect(calls[0]?.body).toEqual({ shiftIds: ["s-morning"] });
	});

	it("given_aBranchDepartmentWeekAndPage_when_theTeamListIsAsked_then_namesEachWithThePageSize", () => {
		expect(
			teamPreferencesPath("c-1", {
				weekStartMonday: FIXTURE_WEEK,
				branchId: "b-1",
				departmentId: "d-1",
				page: 2,
			})
		).toBe(
			`/api/v1/companies/c-1/shift-preferences?weekStartMonday=${FIXTURE_WEEK}&branchId=b-1&departmentId=d-1&page=2&size=${TEAM_PAGE_SIZE}`
		);
	});

	it.each([
		{ name: "noMembersNeedNoMorePages", total: 0, pages: [] },
		{ name: "oneFullPageNeedsNoMore", total: TEAM_PAGE_SIZE, pages: [] },
		{
			name: "oneMoreMemberNeedsASecondPage",
			total: TEAM_PAGE_SIZE + 1,
			pages: [1],
		},
		{
			name: "threePagesNeedTheSecondAndThird",
			total: TEAM_PAGE_SIZE * 3,
			pages: [1, 2],
		},
	])(
		"given_aTeamListTotal_when_itsLaterPagesAreAsked_then_$name",
		({ total, pages }) => {
			expect(teamPagesAfterFirst(total)).toEqual(pages);
		}
	);

	it("given_noUnit_when_theTeamListIsAsked_then_leavesBothOutForEveryUnitInReach", () => {
		expect(
			teamPreferencesPath("c-1", { weekStartMonday: FIXTURE_WEEK, page: 0 })
		).toBe(
			`/api/v1/companies/c-1/shift-preferences?weekStartMonday=${FIXTURE_WEEK}&page=0&size=${TEAM_PAGE_SIZE}`
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

	it("given_aRemovedMember_when_theTeamPageIsRead_then_keepsTheRowWithANullName", async () => {
		stubApi({
			"GET /api/v1/companies/c-1/shift-preferences": {
				status: 200,
				body: envelope(fixtureTeamPageWithFormerMember()),
			},
		});

		const page = await fetchTeamPreferences("c-1", {
			departmentId: "d-1",
			weekStartMonday: FIXTURE_WEEK,
			page: 0,
		});

		expect(page.content.map((member) => member.displayName)).toEqual([
			"Alex Example",
			null,
		]);
	});

	it("given_anOwnWeekATeamPageAndAMembersWeek_when_keyed_then_eachHasItsOwnStableKey", () => {
		expect(myPreferenceWeekKey("c-1", FIXTURE_WEEK)).toEqual([
			"shiftPreferences",
			"c-1",
			"me",
			FIXTURE_WEEK,
		]);
		expect(
			teamPreferencesKey("c-1", {
				weekStartMonday: FIXTURE_WEEK,
				branchId: "b-1",
				page: 0,
			})
		).toEqual(["shiftPreferences", "c-1", "team", "b-1", "", FIXTURE_WEEK, 0]);
		expect(memberPreferenceWeekKey("c-1", "m-1", FIXTURE_WEEK)).toEqual([
			"shiftPreferences",
			"c-1",
			"member",
			"m-1",
			FIXTURE_WEEK,
		]);
	});

	it("given_theListAndAnObserverThatAsksNothingOnOneKey_when_invalidatedAfterASave_then_theListIsReadAgain", async () => {
		const calls = stubApi({
			"GET /api/v1/companies/c-1/shift-preferences": {
				status: 200,
				body: envelope(fixtureTeamPage()),
			},
		});
		const client = new QueryClient();
		// "All branches": no Branch, so the key's Branch part is "".
		const query = {
			departmentId: "d-1",
			weekStartMonday: FIXTURE_WEEK,
			page: 0,
		};
		const list = new QueryObserver(
			client,
			teamPreferencesQuery("c-1", query, true)
		);
		const stopList = list.subscribe(() => {});
		await vi.waitFor(() => {
			expect(list.getCurrentResult().isSuccess).toBe(true);
		});
		// "Apply shift preferences" observes the same key while its dialog is closed, and is set last.
		const stopIdle = new QueryObserver(
			client,
			teamPreferencesQuery("c-1", query, false)
		).subscribe(() => {});

		await client.invalidateQueries({ queryKey: teamPreferencesRoot("c-1") });

		expect(calls).toHaveLength(2);
		expect(list.getCurrentResult().isError).toBe(false);
		stopIdle();
		stopList();
		client.clear();
	});
});
