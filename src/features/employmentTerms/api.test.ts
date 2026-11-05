import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	changeTermsFromDate,
	correctTerms,
	fetchActiveTerms,
	fetchMemberTerms,
	fetchTermsOverview,
} from "@/features/employmentTerms/api";
import {
	MEMBER_TERMS,
	REFERENCE,
	SIX_DAY_SHIFT,
	overviewResponse,
	termsListResponse,
} from "@/features/employmentTerms/fixtures";

const BASE = "/api/v1/companies/c-1";

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

describe("employment terms api", () => {
	it("reads values newer than the app as UNKNOWN instead of failing", async () => {
		stubApi({
			[`GET ${BASE}/employment-terms/overview`]: {
				status: 200,
				body: envelope({
					terms: [
						{
							terms: { ...SIX_DAY_SHIFT, status: "ARCHIVED", restDay: "LUNAR" },
							holderCount: 1,
							scheduledCount: 0,
						},
					],
				}),
			},
		});

		const overview = await fetchTermsOverview("c-1");

		expect(overview.terms[0]).toMatchObject({
			status: "UNKNOWN",
			restDay: "UNKNOWN",
		});
	});

	it("reads a person's terms and history, with sources newer than the app", async () => {
		stubApi({
			[`GET ${BASE}/member-profiles/m-1/employment-terms`]: {
				status: 200,
				body: envelope({
					...MEMBER_TERMS,
					history: [{ ...MEMBER_TERMS.history[0], source: "API_SYNC" }],
				}),
			},
		});

		const terms = await fetchMemberTerms("c-1", "m-1");

		expect(terms.inForce?.name).toBe("Six-day shift, 12 h");
		expect(terms.history[0]?.source).toBe("UNKNOWN");
	});

	it("reads each overview row as the terms with their counts", async () => {
		stubApi({
			[`GET ${BASE}/employment-terms/overview`]: {
				status: 200,
				body: envelope(overviewResponse([SIX_DAY_SHIFT])),
			},
		});

		const overview = await fetchTermsOverview("c-1");

		expect(overview.terms[0]).toMatchObject({
			id: SIX_DAY_SHIFT.id,
			holderCount: 41,
			scheduledCount: 2,
		});
	});

	it("reads the pickers' list with its reference figures", async () => {
		stubApi({
			[`GET ${BASE}/employment-terms`]: {
				status: 200,
				body: envelope(termsListResponse([SIX_DAY_SHIFT])),
			},
		});

		const list = await fetchActiveTerms("c-1");

		expect(list.terms.map((each) => each.id)).toEqual([SIX_DAY_SHIFT.id]);
		expect(list.reference).toEqual(REFERENCE);
	});

	it("corrects terms for everyone through the query, with the fields only", async () => {
		const calls = stubApi({
			[`PUT ${BASE}/employment-terms/terms-six-day-shift`]: {
				status: 200,
				body: envelope(SIX_DAY_SHIFT),
			},
		});

		await correctTerms(
			"c-1",
			SIX_DAY_SHIFT.id,
			{ ...SIX_DAY_SHIFT, weekMinutes: 2520 },
			true
		);

		const call = calls[calls.length - 1];
		expect(call?.search).toBe("correctForEveryone=true");
		expect(call?.body).toMatchObject({ weekMinutes: 2520 });
		expect(call?.body).not.toHaveProperty("apply");
	});

	it("changes terms from a date on their own route", async () => {
		const calls = stubApi({
			[`POST ${BASE}/employment-terms/terms-six-day-shift/changes`]: {
				status: 201,
				body: envelope({
					previousTerms: SIX_DAY_SHIFT,
					newTerms: {
						...SIX_DAY_SHIFT,
						id: "new",
						name: "Six-day shift, 42 h",
					},
					moved: 41,
					ownHoursCleared: 0,
				}),
			},
		});

		const change = await changeTermsFromDate("c-1", SIX_DAY_SHIFT.id, {
			startsOn: "2027-01-04",
			newTerms: {
				...SIX_DAY_SHIFT,
				name: "Six-day shift, 42 h",
				weekMinutes: 2520,
			},
		});

		expect(change.moved).toBe(41);
		expect(calls[calls.length - 1]?.body).toMatchObject({
			startsOn: "2027-01-04",
			newTerms: { name: "Six-day shift, 42 h", weekMinutes: 2520 },
		});
	});
});
