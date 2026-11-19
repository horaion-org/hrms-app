import { renderHook, waitFor } from "@testing-library/react";
import {
	QueryClient,
	QueryClientProvider,
	useMutation,
	useQuery,
} from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
	apiRequest,
	apiRequestVoid,
	configureApiClient,
	resetApiClient,
} from "@/common/api-client";
import { isDecisionEngineStale } from "@/common/problem";
import { queryClient } from "@/common/query-client";
import { envelope, problemReply, stubApi } from "@/common/testing/stubApi";
import type { FunctionComponent } from "@/common/types";

/*
 * How the app meets `503 DECISION_ENGINE_STALE` end to end: the API client
 * and the query client's shared defaults, against a stubbed API. The API
 * says `Retry-After: 0` here so the retries run at once.
 */

const PATH = "/api/v1/companies/c-1/branches";
const STALE = problemReply(503, "DECISION_ENGINE_STALE", { "Retry-After": "0" });

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

/** A query client with the app's own defaults, fresh for each test. */
const wrapper = ({ children }: { children: ReactNode }): FunctionComponent => (
	<QueryClientProvider
		client={new QueryClient({ defaultOptions: queryClient.getDefaultOptions() })}
	>
		{children}
	</QueryClientProvider>
);

const useBranchRead = (): ReturnType<typeof useQuery<{ count: number }>> =>
	useQuery({
		queryKey: ["branches"],
		queryFn: () => apiRequest(PATH, z.object({ count: z.number() })),
	});

describe("a 503 while access is updated", () => {
	it("passes on the retry once the API's access rules catch up", async () => {
		const calls = stubApi({
			[`GET ${PATH}`]: [STALE, { status: 200, body: envelope({ count: 2 }) }],
		});
		const { result } = renderHook(useBranchRead, { wrapper });

		await waitFor(() => {
			expect(result.current.data).toEqual({ count: 2 });
		});
		expect(calls).toHaveLength(2);
	});

	it("gives up after two retries and reports the stale refusal for the screen to explain", async () => {
		const calls = stubApi({ [`GET ${PATH}`]: STALE });
		const { result } = renderHook(useBranchRead, { wrapper });

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});
		expect(isDecisionEngineStale(result.current.error)).toBe(true);
		expect(calls).toHaveLength(3);
	});

	it("never repeats a write by itself", async () => {
		const calls = stubApi({ [`PUT ${PATH}/b-1`]: STALE });
		const { result } = renderHook(
			() =>
				useMutation({
					mutationFn: () => apiRequestVoid(`${PATH}/b-1`, { method: "PUT" }),
				}),
			{ wrapper }
		);

		result.current.mutate();

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});
		expect(calls).toHaveLength(1);
	});
});
