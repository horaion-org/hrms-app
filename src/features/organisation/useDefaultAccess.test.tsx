import { act, renderHook, waitFor } from "@testing-library/react";
import {
	QueryClient,
	QueryClientProvider,
	useQuery,
} from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import type { FunctionComponent } from "@/common/types";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	defaultAccessRecipientQuery,
	defaultAccessRulesQuery,
	useAddDefaultAccessRule,
	useGiveDefaultAccess,
	useRemoveDefaultAccessRule,
	useStopDefaultAccess,
} from "@/features/organisation/useDefaultAccess";

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

const wrapperFor =
	(client: QueryClient) =>
	({ children }: { children: ReactNode }): FunctionComponent => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);

describe("default access queries", () => {
	it("does not ask for the defaults without read at the company", () => {
		const calls = stubApi({});
		const { result } = renderHook(
			() => useQuery(defaultAccessRulesQuery("c-1", false)),
			{ wrapper: wrapperFor(new QueryClient()) }
		);

		expect(result.current.fetchStatus).toBe("idle");
		expect(calls).toHaveLength(0);
	});

	it("asks whether a person receives default access when allowed", async () => {
		stubApi({
			"GET /api/v1/companies/c-1/default-access-recipients/m-1": {
				status: 200,
				body: envelope({
					companyMembershipId: "m-1",
					receivesDefaultAccess: false,
					receivingSince: null,
				}),
			},
		});
		const { result } = renderHook(
			() => useQuery(defaultAccessRecipientQuery("c-1", "m-1", true)),
			{ wrapper: wrapperFor(new QueryClient()) }
		);

		await waitFor(() => {
			expect(result.current.data?.receivesDefaultAccess).toBe(false);
		});
	});
});

describe("default access changes", () => {
	const seeded = (): QueryClient => {
		const client = new QueryClient();
		client.setQueryData(["organisation", "c-1", "default-access-rules"], []);
		client.setQueryData(["organisation", "c-2", "default-access-rules"], []);
		return client;
	};
	const stale = (client: QueryClient, companyId: string): boolean | undefined =>
		client
			.getQueryCache()
			.find({ queryKey: ["organisation", companyId, "default-access-rules"] })
			?.isStale();

	it("reloads this company's Organisation entries after a removal, not another company's", async () => {
		stubApi({
			"DELETE /api/v1/companies/c-1/default-access-rules/d-1": { status: 204 },
		});
		const client = seeded();
		const { result } = renderHook(() => useRemoveDefaultAccessRule("c-1"), {
			wrapper: wrapperFor(client),
		});

		await act(async () => {
			await result.current.mutateAsync("d-1");
		});

		expect(stale(client, "c-1")).toBe(true);
		expect(stale(client, "c-2")).toBe(false);
	});

	it("adds a default with its place in the body and reloads", async () => {
		const calls = stubApi({
			"POST /api/v1/companies/c-1/default-access-rules": {
				status: 201,
				body: envelope({
					defaultAccessRuleId: "d-1",
					accessRoleId: "r-1",
					setAt: "BRANCH",
					branchId: "b-1",
					departmentId: null,
					appliesTo: "OWN_BRANCH",
				}),
			},
		});
		const client = seeded();
		const { result } = renderHook(() => useAddDefaultAccessRule("c-1"), {
			wrapper: wrapperFor(client),
		});

		await act(async () => {
			await result.current.mutateAsync({
				accessRoleId: "r-1",
				appliesTo: "OWN_BRANCH",
				branchId: "b-1",
			});
		});

		expect(calls[0]?.body).toEqual({
			accessRoleId: "r-1",
			appliesTo: "OWN_BRANCH",
			branchId: "b-1",
		});
		expect(stale(client, "c-1")).toBe(true);
	});

	it("gives default access and hands back both counts", async () => {
		stubApi({
			"POST /api/v1/companies/c-1/default-access-recipients": {
				status: 200,
				body: envelope({ given: 1, alreadyReceiving: 1 }),
			},
		});
		const { result } = renderHook(() => useGiveDefaultAccess("c-1"), {
			wrapper: wrapperFor(seeded()),
		});

		let given: unknown;
		await act(async () => {
			given = await result.current.mutateAsync(["m-1", "m-2"]);
		});

		expect(given).toEqual({ given: 1, alreadyReceiving: 1 });
	});

	it("stops default access and reloads", async () => {
		const calls = stubApi({
			"DELETE /api/v1/companies/c-1/default-access-recipients/m-1": {
				status: 204,
			},
		});
		const client = seeded();
		const { result } = renderHook(() => useStopDefaultAccess("c-1"), {
			wrapper: wrapperFor(client),
		});

		await act(async () => {
			await result.current.mutateAsync("m-1");
		});

		expect(calls[0]?.method).toBe("DELETE");
		expect(stale(client, "c-1")).toBe(true);
	});

	it("settles once the API has given access, without waiting for the re-read", async () => {
		stubApi({
			"POST /api/v1/companies/c-1/default-access-recipients": {
				status: 200,
				body: envelope({ given: 1, alreadyReceiving: 0 }),
			},
		});
		const client = new QueryClient();
		const { result } = renderHook(
			() => {
				// An Organisation read that never answers, as one retrying a 503 does.
				useQuery({
					queryKey: ["organisation", "c-1", "default-access-rules"],
					queryFn: () => new Promise<never>(() => {}),
				});
				return useGiveDefaultAccess("c-1");
			},
			{ wrapper: wrapperFor(client) }
		);

		act(() => {
			result.current.mutate(["m-1"]);
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});
	});
});
