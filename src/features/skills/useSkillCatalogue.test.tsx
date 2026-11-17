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
import { useAssignSkill } from "@/features/skills/useBulkAssign";
import { useDeleteSkill } from "@/features/skills/useSkillCatalogue";

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

const wrapper = ({ children }: { children: ReactNode }): FunctionComponent => (
	<QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

/** An Organisation read that never answers, as one retrying a 503 does. */
const useHangingRead = (): void => {
	useQuery({
		queryKey: ["organisation", "c-1", "skill-overview"],
		queryFn: () => new Promise<never>(() => {}),
	});
};

describe("skill catalogue changes", () => {
	it("settle once the API has deleted the skill, without waiting for the re-read", async () => {
		stubApi({
			"DELETE /api/v1/companies/c-1/skills/s-1": { status: 204 },
		});
		const { result } = renderHook(
			() => {
				useHangingRead();
				return useDeleteSkill("c-1");
			},
			{ wrapper }
		);

		act(() => {
			result.current.mutate("s-1");
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});
	});

	it("settle once the API has given the skill to people, without waiting for the re-read", async () => {
		stubApi({
			"POST /api/v1/companies/c-1/skills/s-1/assignments": {
				status: 200,
				body: envelope({ assigned: 1, updated: 0, skipped: 0, full: 0 }),
			},
		});
		const { result } = renderHook(
			() => {
				useHangingRead();
				return useAssignSkill("c-1", "s-1");
			},
			{ wrapper }
		);

		act(() => {
			result.current.mutate({
				membershipIds: ["m-1"],
				proficiency: null,
				notes: null,
				issuedOn: null,
				expiresOn: null,
				overwrite: false,
			});
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});
	});
});
