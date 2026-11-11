import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import type { FunctionComponent } from "@/common/types";
import {
	envelope,
	problemReply,
	stubApi,
	type StubReply,
} from "@/common/testing/stubApi";
import { storyCompany } from "@/features/people/storyCompany";
import { SCHEDULING_UNIT_RULES } from "@/features/scheduling/schedules/schedulesUnitRules";
import {
	TWO_SCHEDULING_BRANCHES,
	twoBranchSchedulingWorkspace,
} from "@/features/scheduling/schedules/fixtures";
import { CONSTRAINT_FIXTURES } from "@/features/scheduling/constraints/fixtures";
import { useConstraintsInUnits } from "@/features/scheduling/constraints/useConstraintsInUnits";
import {
	ALL_BRANCHES,
	resolveWorkspaceUnits,
} from "@/features/workspace/unitSelection";
import type { UnitSelection } from "@/features/workspace/unitSearch";

const COMPANY_CONSTRAINTS = "GET /api/v1/companies/c-1/constraints";
const FRONT_OFFICE_CONSTRAINTS =
	"GET /api/v1/companies/c-1/branches/b-1/departments/d-1/constraints";
const LIVE = CONSTRAINT_FIXTURES[2]!;

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

/** Lists constraints in `requested` units of c-1 (Main branch and North), holding `permissions` company-wide. */
const listConstraints = (
	requested: UnitSelection,
	permissions: Array<string>
): ReturnType<
	typeof renderHook<ReturnType<typeof useConstraintsInUnits>, unknown>
> => {
	const units = resolveWorkspaceUnits(
		twoBranchSchedulingWorkspace(permissions),
		"c-1",
		["constraint:read"],
		requested,
		SCHEDULING_UNIT_RULES
	);
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
				TWO_SCHEDULING_BRANCHES
			)(
				() => (
					<>{children}</>
				),
				{ parameters: { permissions } } as never
			)}
		</QueryClientProvider>
	);
	return renderHook(() => useConstraintsInUnits("c-1", units), { wrapper });
};

const ok = (body: unknown): StubReply => ({
	status: 200,
	body: envelope(body),
});

describe("useConstraintsInUnits", () => {
	it("given_oneDepartment_when_listed_then_readsThatDepartmentsConstraints", async () => {
		const calls = stubApi({ [FRONT_OFFICE_CONSTRAINTS]: ok([LIVE]) });
		const { result } = listConstraints(
			{ branchId: "b-1", departmentId: "d-1" },
			["constraint:read"]
		);

		await waitFor(() => {
			expect(result.current).toEqual({ status: "ready", items: [LIVE] });
		});
		expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
			FRONT_OFFICE_CONSTRAINTS,
		]);
	});

	it("given_aBranch_when_listed_then_readsTheCompanysConstraintsInThatBranch", async () => {
		const calls = stubApi({ [COMPANY_CONSTRAINTS]: ok([LIVE]) });
		const { result } = listConstraints({ branchId: "b-1" }, [
			"constraint:read",
		]);

		await waitFor(() => {
			expect(result.current).toEqual({ status: "ready", items: [LIVE] });
		});
		expect(calls.map((call) => call.search)).toEqual(["branchId=b-1"]);
	});

	it("given_everyBranch_when_listed_then_readsTheCompanysConstraintsWithoutABranch", async () => {
		const calls = stubApi({ [COMPANY_CONSTRAINTS]: ok([LIVE]) });
		const { result } = listConstraints({ branchId: ALL_BRANCHES }, [
			"constraint:read",
		]);

		await waitFor(() => {
			expect(result.current.status).toBe("ready");
		});
		expect(calls.map((call) => call.search)).toEqual([""]);
	});

	it("given_aRefusal_when_listed_then_isHidden", async () => {
		stubApi({ [COMPANY_CONSTRAINTS]: problemReply(403, "ACCESS_DENIED") });
		const { result } = listConstraints({ branchId: "b-1" }, [
			"constraint:read",
		]);

		await waitFor(() => {
			expect(result.current.status).toBe("hidden");
		});
	});

	it("given_noReadKey_when_listed_then_isHiddenAndAsksForNothing", async () => {
		const calls = stubApi({});
		const { result } = listConstraints({ branchId: "b-1" }, ["schedule:read"]);

		await waitFor(() => {
			expect(result.current.status).toBe("hidden");
		});
		expect(calls).toEqual([]);
	});
});
