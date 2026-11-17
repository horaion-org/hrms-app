import { act, renderHook, waitFor } from "@testing-library/react";
import {
	QueryClient,
	QueryClientProvider,
	useQuery,
} from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import type { FunctionComponent } from "@/common/types";
import {
	useAccessRoleHolders,
	useChangeAccessRoleHolders,
} from "@/features/organisation/useAccessRoleHolders";

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

const HOLDERS_PATH =
	"GET /api/v1/companies/c-1/access-roles/r-1/access-role-assignments";

const wrapperFor =
	(client: QueryClient) =>
	({ children }: { children: ReactNode }): FunctionComponent => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);

describe("useAccessRoleHolders", () => {
	it("asks for nothing while no role is named, so no path is sent without its id", () => {
		const calls = stubApi({});
		const { result } = renderHook(() => useAccessRoleHolders("c-1", ""), {
			wrapper: wrapperFor(new QueryClient()),
		});

		expect(result.current.fetchStatus).toBe("idle");
		expect(calls).toHaveLength(0);
	});

	it("reads the holders of a named role", async () => {
		stubApi({ [HOLDERS_PATH]: { status: 200, body: envelope([]) } });
		const { result } = renderHook(() => useAccessRoleHolders("c-1", "r-1"), {
			wrapper: wrapperFor(new QueryClient()),
		});

		await waitFor(() => {
			expect(result.current.data).toEqual([]);
		});
	});
});

describe("useChangeAccessRoleHolders", () => {
	it("settles once the API has removed the assignment, without waiting for the re-read", async () => {
		stubApi({
			"DELETE /api/v1/companies/c-1/access-role-assignments/a-1": {
				status: 204,
			},
		});
		const { result } = renderHook(
			() => {
				// An Organisation read that never answers, as one retrying a 503 does.
				useQuery({
					queryKey: ["organisation", "c-1", "access-role-holders", "r-1"],
					queryFn: () => new Promise<never>(() => {}),
				});
				return useChangeAccessRoleHolders("c-1");
			},
			{ wrapper: wrapperFor(new QueryClient()) }
		);

		act(() => {
			result.current.mutate({ revokes: ["a-1"] });
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});
	});
});
