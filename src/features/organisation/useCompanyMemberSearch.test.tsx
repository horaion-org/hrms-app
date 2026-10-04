import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import type { FunctionComponent } from "@/common/types";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { useCompanyMemberSearch } from "@/features/organisation/useCompanyMemberSearch";

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

it("debounces by 250 ms and retains earlier people while searching", async () => {
	const marcus = {
		membershipId: "m-1",
		displayName: "Marcus",
		status: "ACTIVE",
	};
	const calls = stubApi({
		"GET /api/v1/companies/c-1/members": {
			status: 200,
			body: envelope({ content: [marcus], page: { totalElements: 1 } }),
		},
	});
	const client = new QueryClient();
	const wrapper = ({
		children,
	}: {
		children: ReactNode;
	}): FunctionComponent => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	const { result, rerender, unmount } = renderHook(
		({ query }) => useCompanyMemberSearch("c-1", query),
		{ wrapper, initialProps: { query: "" } }
	);
	await waitFor(() => {
		expect(result.current.data?.items).toEqual([marcus]);
	});
	vi.useFakeTimers();
	rerender({ query: "M" });
	await act(async () => {
		await vi.advanceTimersByTimeAsync(200);
	});
	rerender({ query: "Ma" });
	await act(async () => {
		await vi.advanceTimersByTimeAsync(249);
	});
	expect(calls).toHaveLength(1);
	expect(result.current.data?.items).toEqual([marcus]);
	await act(async () => {
		await vi.advanceTimersByTimeAsync(1);
	});
	expect(calls).toHaveLength(2);
	expect(new URLSearchParams(calls[1]?.search).get("search")).toBe("Ma");
	expect(result.current.data).toEqual({ items: [marcus], total: 1 });
	unmount();
	client.clear();
});

it("never shows the previous company's people while the next company loads", async () => {
	stubApi({
		"GET /api/v1/companies/c-1/members": {
			status: 200,
			body: envelope({
				content: [
					{ membershipId: "m-1", displayName: "Marcus", status: "ACTIVE" },
				],
				page: { totalElements: 1 },
			}),
		},
	});
	const fetchBefore = globalThis.fetch;
	let finish: (response: Response) => void = () => {};
	vi.stubGlobal(
		"fetch",
		(url: string, init?: RequestInit): Promise<Response> =>
			url.includes("/c-2/")
				? new Promise<Response>((resolve) => {
						finish = resolve;
					})
				: fetchBefore(url, init)
	);
	const client = new QueryClient();
	const wrapper = ({
		children,
	}: {
		children: ReactNode;
	}): FunctionComponent => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	const { result, rerender, unmount } = renderHook(
		({ companyId }) => useCompanyMemberSearch(companyId, ""),
		{ wrapper, initialProps: { companyId: "c-1" } }
	);
	await waitFor(() => {
		expect(result.current.data?.items[0]?.displayName).toBe("Marcus");
	});
	rerender({ companyId: "c-2" });
	expect(result.current.data).toBeUndefined();
	await act(async () => {
		await Promise.resolve();
	});
	await act(async () => {
		finish(
			new Response(
				JSON.stringify(envelope({ content: [], page: { totalElements: 0 } })),
				{ status: 200, headers: { "Content-Type": "application/json" } }
			)
		);
		await Promise.resolve();
	});
	await waitFor(() => {
		expect(result.current.data?.items).toEqual([]);
	});
	unmount();
	client.clear();
});
