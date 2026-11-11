import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { TEST_BRANCHES } from "@/common/testing/effectiveWorkspace";
import {
	envelope,
	problemReply,
	stubApi,
	type StubReply,
} from "@/common/testing/stubApi";
import type { FunctionComponent } from "@/common/types";
import { storyCompany } from "@/features/people/storyCompany";
import { readinessFixture } from "@/features/scheduling/readiness/fixtures";
import { useSchedulingReadiness } from "@/features/scheduling/readiness/useSchedulingReadiness";
import type { UnitSelection } from "@/features/workspace/unitSelection";

const READINESS = "GET /api/v1/companies/c-1/scheduling-readiness";
const KITCHEN = readinessFixture();

/** Orchard and Tampines, with `schedule:create` granted only at Bar (d-2). */
const CREATE_AT_BAR = TEST_BRANCHES.map((branch) => ({
	...branch,
	departments: branch.departments.map((department) =>
		department.uuid === "d-2"
			? { ...department, permissions: ["schedule:create"] }
			: department
	),
}));

beforeEach(() => {
	configureApiClient({
		accessToken: () => Promise.resolve("test-pass"),
		renew: () => Promise.resolve({ kind: "expired" }),
		onUnauthenticated: () => {},
	});
	// The router scrolls to the top on load, which jsdom does not implement.
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
	resetApiClient();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

/** Asks for readiness in `units` of c-1, holding `permissions` company-wide among `branches`. */
const askReadiness = (
	units: UnitSelection,
	permissions: Array<string>,
	branches = TEST_BRANCHES
): ReturnType<
	typeof renderHook<ReturnType<typeof useSchedulingReadiness>, unknown>
> => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	const wrapper = ({
		children,
	}: {
		children: ReactNode;
	}): FunctionComponent => (
		<QueryClientProvider client={client}>
			{storyCompany(
				client,
				"c-1",
				branches
			)(
				() => (
					<>{children}</>
				),
				{ parameters: { permissions } } as never
			)}
		</QueryClientProvider>
	);
	return renderHook(() => useSchedulingReadiness("c-1", units), { wrapper });
};

const ok = (body: unknown): StubReply => ({
	status: 200,
	body: envelope(body),
});

describe("useSchedulingReadiness", () => {
	it("given_aDepartmentWhereSchedulesMayBeCreated_when_asked_then_readsThatDepartment", async () => {
		const calls = stubApi({ [READINESS]: ok([KITCHEN]) });
		const { result } = askReadiness({ departmentId: "d-1" }, [
			"schedule:create",
		]);

		await waitFor(() => {
			expect(result.current).toEqual({ status: "ready", rows: [KITCHEN] });
		});
		expect(calls.map((call) => call.search)).toEqual(["departmentId=d-1"]);
	});

	it("given_aDepartmentWithoutTheKey_when_asked_then_isHiddenAndAsksForNothing", async () => {
		const calls = stubApi({});
		const { result } = askReadiness({ departmentId: "d-1" }, [], CREATE_AT_BAR);

		await waitFor(() => {
			expect(result.current.status).toBe("hidden");
		});
		expect(calls).toEqual([]);
	});

	it("given_noDepartmentAndTheKeyHeldSomewhere_when_asked_then_readsTheBranch", async () => {
		const calls = stubApi({ [READINESS]: ok([KITCHEN]) });
		const { result } = askReadiness({ branchId: "b-1" }, [], CREATE_AT_BAR);

		await waitFor(() => {
			expect(result.current.status).toBe("ready");
		});
		expect(calls.map((call) => call.search)).toEqual(["branchId=b-1"]);
	});

	it("given_aRefusal_when_asked_then_isHidden", async () => {
		stubApi({ [READINESS]: problemReply(403, "ACCESS_DENIED") });
		const { result } = askReadiness({}, ["schedule:create"]);

		await waitFor(() => {
			expect(result.current.status).toBe("hidden");
		});
	});

	it("given_nothingToAsk_when_rendered_then_isHiddenAndAsksForNothing", async () => {
		const calls = stubApi({});
		const client = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		const { result } = renderHook(
			() => useSchedulingReadiness("c-1", {}, false),
			{
				wrapper: ({ children }: { children: ReactNode }): FunctionComponent => (
					<QueryClientProvider client={client}>
						{storyCompany(client, "c-1")(
							() => (
								<>{children}</>
							),
							{ parameters: { permissions: ["schedule:create"] } } as never
						)}
					</QueryClientProvider>
				),
			}
		);

		await waitFor(() => {
			expect(result.current.status).toBe("hidden");
		});
		expect(calls).toEqual([]);
	});

	it("given_noCreateKey_when_asked_then_isHiddenAndAsksForNothing", async () => {
		const calls = stubApi({});
		const { result } = askReadiness({}, ["shift:read"]);

		await waitFor(() => {
			expect(result.current.status).toBe("hidden");
		});
		expect(calls).toEqual([]);
	});
});
