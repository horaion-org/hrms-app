import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import type { FunctionComponent } from "@/common/types";
import {
	myPreferenceWeekKey,
	teamPreferencesKey,
} from "@/features/shiftPreferences/api";
import {
	FIXTURE_WEEK,
	MONDAY_WITH_MORNING,
} from "@/features/shiftPreferences/fixtures";
import { useReplaceMyPreferenceDay } from "@/features/shiftPreferences/useShiftPreferences";

const NEXT_WEEK = "2026-11-30";

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

/** Saving a day reads its own week again and leaves every other entry as it was. */
it("given_aDaySaved_when_itSucceeds_then_onlyItsOwnWeekIsReadAgain", async () => {
	stubApi({
		[`PUT /api/v1/companies/c-1/me/shift-preferences/days/${FIXTURE_WEEK}`]: {
			status: 200,
			body: envelope(MONDAY_WITH_MORNING),
		},
	});
	const client = new QueryClient();
	const ownWeek = myPreferenceWeekKey("c-1", FIXTURE_WEEK);
	const ownNextWeek = myPreferenceWeekKey("c-1", NEXT_WEEK);
	const teamWeek = teamPreferencesKey("c-1", {
		departmentId: "d-1",
		weekStartMonday: FIXTURE_WEEK,
		page: 0,
	});
	for (const key of [ownWeek, ownNextWeek, teamWeek])
		client.setQueryData(key, {});
	const wrapper = ({
		children,
	}: {
		children: ReactNode;
	}): FunctionComponent => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	const { result, unmount } = renderHook(
		() => useReplaceMyPreferenceDay("c-1", FIXTURE_WEEK),
		{ wrapper }
	);

	await act(async () => {
		await result.current.mutateAsync({
			date: FIXTURE_WEEK,
			shiftIds: ["s-morning"],
		});
	});

	expect(client.getQueryState(ownWeek)?.isInvalidated).toBe(true);
	expect(client.getQueryState(ownNextWeek)?.isInvalidated).toBe(false);
	expect(client.getQueryState(teamWeek)?.isInvalidated).toBe(false);
	unmount();
	client.clear();
});
