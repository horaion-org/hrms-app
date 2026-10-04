import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import type { FunctionComponent } from "@/common/types";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { useCreateBranch } from "@/features/organisation/useCreateBranch";

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

it("invalidates this company's lists and overview without invalidating another company", async () => {
	stubApi({
		"POST /api/v1/companies/c-1/branches": {
			status: 201,
			body: envelope({
				branchId: "b-1",
				name: "Orchard",
				code: "ORC",
				status: "ACTIVE",
			}),
		},
	});
	const client = new QueryClient();
	const branches = ["organisation", "c-1", "branches"];
	const overview = ["organisation", "c-1", "active-branch-count"];
	const otherCompany = ["organisation", "c-2", "branches"];
	for (const key of [branches, overview, otherCompany])
		client.setQueryData(key, []);
	const wrapper = ({
		children,
	}: {
		children: ReactNode;
	}): FunctionComponent => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	const { result, unmount } = renderHook(() => useCreateBranch("c-1"), {
		wrapper,
	});
	await act(async () => {
		await result.current.mutateAsync({
			name: "Orchard",
			code: "ORC",
			initialHeadCompanyMembershipIds: ["m-1"],
		});
	});
	expect(client.getQueryState(branches)?.isInvalidated).toBe(true);
	expect(client.getQueryState(overview)?.isInvalidated).toBe(true);
	expect(client.getQueryState(otherCompany)?.isInvalidated).toBe(false);
	unmount();
	client.clear();
});
