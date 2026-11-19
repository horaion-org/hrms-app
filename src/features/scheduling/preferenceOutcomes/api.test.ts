import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	fetchMyRosterPreferenceOutcomes,
	fetchRosterPreferenceOutcomes,
	rosterPreferenceOutcomesKey,
} from "@/features/scheduling/preferenceOutcomes/api";
import { fixtureOutcomes } from "@/features/shiftPreferences/fixtures";

const OUTCOMES = { scheduleId: "s-1", preferences: fixtureOutcomes() };

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

describe("roster preference outcomes API", () => {
	it("given_aRoster_when_itsOutcomesAreRead_then_asksTheSchedulesOwnRoute", async () => {
		stubApi({
			"GET /api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1/shift-preferences":
				{ status: 200, body: envelope(OUTCOMES) },
		});

		await expect(
			fetchRosterPreferenceOutcomes(
				"c-1",
				{ branchId: "b-1", departmentId: "d-1" },
				"s-1"
			)
		).resolves.toEqual(OUTCOMES);
	});

	it("given_theCallersOwnRoster_when_itsOutcomesAreRead_then_asksTheSelfRoute", async () => {
		stubApi({
			"GET /api/v1/companies/c-1/me/schedules/s-1/shift-preferences": {
				status: 200,
				body: envelope(OUTCOMES),
			},
		});

		await expect(
			fetchMyRosterPreferenceOutcomes("c-1", "s-1")
		).resolves.toEqual(OUTCOMES);
	});

	it("given_aHandChange_when_keyed_then_theNewRevisionIsANewEntry", () => {
		expect(rosterPreferenceOutcomesKey("c-1", "s-1", "r-1", 3)).not.toEqual(
			rosterPreferenceOutcomesKey("c-1", "s-1", "r-1", 4)
		);
	});
});
