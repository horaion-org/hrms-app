import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import type { FunctionComponent } from "@/common/types";
import { useAccessRoleHolders } from "@/features/organisation/useAccessRoleHolders";

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
