import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	availabilityListPath,
	availabilityListQuery,
	availabilityRoot,
	deleteWeekAvailability,
	fetchAvailability,
	fetchPartTimeMembersWithoutAvailability,
	fetchWeekAvailability,
	memberOwner,
	MY_AVAILABILITY,
	replaceWeekAvailability,
} from "@/features/availability/api";
import { MEMBER_WEEK_FIXTURES } from "@/features/availability/fixtures";

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

		await expect(fetchAvailability("c-1", memberOwner("m-1"))).resolves.toEqual(
			{
				membershipId: "m-1",
				days: [],
				overrideWeeks: [],
			}
		);
	});

	it("given_aWeekWithoutAnOverride_when_read_then_answersNone", async () => {
		stubApi({ [`GET ${WEEK}`]: { status: 404 } });

		await expect(
			fetchWeekAvailability("c-1", memberOwner("m-1"), "2026-11-09")
		).resolves.toBeNull();
	});

	it("given_aWeekAlreadyOnThePattern_when_reset_then_isDone", async () => {
		const calls = stubApi({ [`DELETE ${WEEK}`]: { status: 404 } });

		await expect(
			deleteWeekAvailability("c-1", memberOwner("m-1"), "2026-11-09")
		).resolves.toBeUndefined();
		expect(calls.map((call) => call.method)).toEqual(["DELETE"]);
	});

	it("given_theCallersOwnWeek_when_replaced_then_putsToTheSelfRoute", async () => {
		const calls = stubApi({
			"PUT /api/v1/companies/c-1/me/availability/weeks/2026-11-09": {
				status: 200,
				body: envelope({
					membershipId: "m-me",
					weekStartMonday: "2026-11-09",
					days: [],
				}),
			},
		});

		await replaceWeekAvailability("c-1", MY_AVAILABILITY, "2026-11-09", {
			windows: [],
		});

		expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
			"PUT /api/v1/companies/c-1/me/availability/weeks/2026-11-09",
		]);
		expect(calls[0]?.body).toEqual({ windows: [] });
	});

	it("given_aDepartment_when_theListIsAsked_then_namesTheWeekBranchAndDepartment", () => {
		expect(
			availabilityListPath("c-1", {
				branchId: "b-1",
				weekStartMonday: "2026-11-09",
				departmentId: "d-1",
			})
		).toBe(
			"/api/v1/companies/c-1/availability?weekStartMonday=2026-11-09&branchId=b-1&departmentId=d-1"
		);
		expect(
			availabilityListPath("c-1", {
				branchId: "b-1",
				weekStartMonday: "2026-11-09",
			})
		).toBe(
			"/api/v1/companies/c-1/availability?weekStartMonday=2026-11-09&branchId=b-1"
		);
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

	it("given_theListAndAnObserverThatAsksNothingOnOneKey_when_invalidatedAfterASave_then_theListIsReadAgain", async () => {
		const calls = stubApi({
			"GET /api/v1/companies/c-1/availability": {
				status: 200,
				body: envelope({
					weekStartMonday: "2027-11-01",
					members: MEMBER_WEEK_FIXTURES,
				}),
			},
		});
		const client = new QueryClient();
		// "All branches": no Branch in the query.
		const query = { weekStartMonday: "2027-11-01" };
		const list = new QueryObserver(
			client,
			availabilityListQuery("c-1", query, true)
		);
		const stopList = list.subscribe(() => {});
		await vi.waitFor(() => {
			expect(list.getCurrentResult().isSuccess).toBe(true);
		});
		// "Apply availability" observes the same key while its dialog is closed, and is set last.
		const stopIdle = new QueryObserver(
			client,
			availabilityListQuery("c-1", query, false)
		).subscribe(() => {});

		await client.invalidateQueries({ queryKey: availabilityRoot("c-1") });

		expect(calls).toHaveLength(2);
		expect(list.getCurrentResult().isError).toBe(false);
		stopIdle();
		stopList();
		client.clear();
	});
});
