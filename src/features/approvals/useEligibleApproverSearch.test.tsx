import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import type { FunctionComponent } from "@/common/types";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { SCHEDULE_PUBLICATION } from "@/features/approvals/api";
import { useEligibleApproverSearch } from "@/features/approvals/useEligibleApproverSearch";

const ELIGIBLE = "GET /api/v1/companies/c-1/approval-flows/eligible-approvers";
const SITI = {
	membershipId: "m-3",
	displayName: "Siti Rahman",
	status: "ACTIVE",
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
	vi.useRealTimers();
});

const wrapperFor =
	(client: QueryClient) =>
	({ children }: { children: ReactNode }): FunctionComponent => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);

const page = {
	status: 200,
	body: envelope({ content: [SITI], page: { totalElements: 1 } }),
};

it("given_typing_when_searched_then_asksOnceAfterTheDebounceWithTheSearch", async () => {
	const calls = stubApi({ [ELIGIBLE]: page });
	const client = new QueryClient();
	const { result, rerender, unmount } = renderHook(
		({ query }) =>
			useEligibleApproverSearch("c-1", SCHEDULE_PUBLICATION, "d-1", query),
		{ wrapper: wrapperFor(client), initialProps: { query: "" } }
	);
	await waitFor(() => {
		expect(result.current.data?.items).toEqual([SITI]);
	});
	vi.useFakeTimers();
	rerender({ query: "S" });
	await act(async () => {
		await vi.advanceTimersByTimeAsync(200);
	});
	rerender({ query: "Si" });
	await act(async () => {
		await vi.advanceTimersByTimeAsync(250);
	});

	expect(calls).toHaveLength(2);
	expect(new URLSearchParams(calls[1]?.search).get("search")).toBe("Si");
	expect(new URLSearchParams(calls[1]?.search).get("departmentId")).toBe("d-1");
	unmount();
	client.clear();
});

it("given_otherDepartment_when_chosen_then_asksForItAndNeverShowsTheOldPeople", async () => {
	const calls = stubApi({ [ELIGIBLE]: page });
	const fetchBefore = globalThis.fetch;
	vi.stubGlobal(
		"fetch",
		(url: string, init?: RequestInit): Promise<Response> =>
			url.includes("departmentId=d-2")
				? new Promise<Response>(() => {})
				: fetchBefore(url, init)
	);
	const client = new QueryClient();
	const { result, rerender, unmount } = renderHook(
		({ departmentId }) =>
			useEligibleApproverSearch("c-1", SCHEDULE_PUBLICATION, departmentId, ""),
		{ wrapper: wrapperFor(client), initialProps: { departmentId: "d-1" } }
	);
	await waitFor(() => {
		expect(result.current.data?.items).toEqual([SITI]);
	});

	rerender({ departmentId: "d-2" });

	expect(result.current.data).toBeUndefined();
	await waitFor(() => {
		expect(result.current.isFetching).toBe(true);
	});
	expect(calls).toHaveLength(1);
	unmount();
	client.clear();
});

it("given_listAlreadyLoaded_when_mountedAgain_then_asksAgain", async () => {
	const calls = stubApi({ [ELIGIBLE]: page });
	const client = new QueryClient();
	const render = (): ReturnType<typeof renderHook> =>
		renderHook(
			() => useEligibleApproverSearch("c-1", SCHEDULE_PUBLICATION, "", ""),
			{ wrapper: wrapperFor(client) }
		);
	const first = render();
	await waitFor(() => {
		expect(calls).toHaveLength(1);
	});
	first.unmount();

	const second = render();

	await waitFor(() => {
		expect(calls).toHaveLength(2);
	});
	second.unmount();
	client.clear();
});
