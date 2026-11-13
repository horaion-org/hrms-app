import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import type { FunctionComponent } from "@/common/types";
import { envelope, problemReply, stubApi } from "@/common/testing/stubApi";
import { leaveOptionsQuery } from "@/features/leave/api";
import {
	leaveDurationCatalogueQuery,
	type LeaveDurationOrderBody,
} from "@/features/leaveDurations/api";
import { LEAVE_DURATION_CATALOGUE_FIXTURE } from "@/features/leaveDurations/fixtures";
import { useLeaveDurationActions } from "@/features/leaveDurations/useLeaveDurationActions";

const LEAVE_DURATIONS = "/api/v1/companies/c-1/leave-durations";
const ORDER: LeaveDurationOrderBody = {
	leaveDurationIds: ["ld-prep", "ld-morning", "ld-night"],
};

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

const setUp = (): {
	client: QueryClient;
	invalidated: (key: ReadonlyArray<unknown>) => boolean | undefined;
	actions: () => ReturnType<typeof useLeaveDurationActions>;
} => {
	const client = new QueryClient({
		defaultOptions: { mutations: { retry: false } },
	});
	client.setQueryData(leaveOptionsQuery("c-1").queryKey, { leaveTypes: [] });
	client.setQueryData(leaveDurationCatalogueQuery("c-1").queryKey, []);
	client.setQueryData(leaveOptionsQuery("c-2").queryKey, { leaveTypes: [] });
	client.setQueryData(leaveDurationCatalogueQuery("c-2").queryKey, []);
	const wrapper = ({
		children,
	}: {
		children: ReactNode;
	}): FunctionComponent => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	const { result } = renderHook(() => useLeaveDurationActions("c-1"), {
		wrapper,
	});
	return {
		client,
		invalidated: (key) => client.getQueryState(key)?.isInvalidated,
		actions: () => result.current,
	};
};

it("reloads the durations and the apply form's options after a delete, this company's only", async () => {
	stubApi({ [`DELETE ${LEAVE_DURATIONS}/ld-prep`]: { status: 204 } });
	const { invalidated, actions } = setUp();

	await act(() => actions().deleteLeaveDuration.mutateAsync("ld-prep"));

	expect(invalidated(leaveDurationCatalogueQuery("c-1").queryKey)).toBe(true);
	expect(invalidated(leaveOptionsQuery("c-1").queryKey)).toBe(true);
	expect(invalidated(leaveDurationCatalogueQuery("c-2").queryKey)).toBe(false);
	expect(invalidated(leaveOptionsQuery("c-2").queryKey)).toBe(false);
});

it("shows a new order at once and reloads after a refused one, so the next try starts fresh", async () => {
	stubApi({
		[`PUT ${LEAVE_DURATIONS}/order`]: [
			{ status: 200, body: envelope(LEAVE_DURATION_CATALOGUE_FIXTURE) },
			problemReply(400, "INVALID_LEAVE_DURATION_ORDER"),
		],
	});
	const { client, invalidated, actions } = setUp();

	await act(() => actions().reorderLeaveDurations.mutateAsync(ORDER));
	expect(
		client.getQueryData(leaveDurationCatalogueQuery("c-1").queryKey)
	).toEqual(LEAVE_DURATION_CATALOGUE_FIXTURE);

	client.setQueryData(leaveDurationCatalogueQuery("c-1").queryKey, []);
	await act(async () => {
		await actions()
			.reorderLeaveDurations.mutateAsync(ORDER)
			.catch(() => undefined);
	});
	expect(invalidated(leaveDurationCatalogueQuery("c-1").queryKey)).toBe(true);
});
