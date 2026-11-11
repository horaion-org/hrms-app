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
import { departmentShiftFixture } from "@/features/scheduling/shifts/fixtures";
import { useShiftsInUnits } from "@/features/scheduling/shifts/useShiftsInUnits";
import { SHIFT_READ_KEYS } from "@/features/workspace/permissionKeys";
import {
	ALL_BRANCHES,
	resolveWorkspaceUnits,
} from "@/features/workspace/unitSelection";
import type { UnitSelection } from "@/features/workspace/unitSearch";

const COMPANY_SHIFTS = "GET /api/v1/companies/c-1/shifts";
const FRONT_OFFICE_SHIFTS =
	"GET /api/v1/companies/c-1/branches/b-1/departments/d-1/shifts";
const LIVE = departmentShiftFixture();

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

/** Lists shifts in `requested` units of c-1 (Main branch and North), holding `permissions` company-wide. */
const listShifts = (
	requested: UnitSelection,
	permissions: Array<string>
): ReturnType<
	typeof renderHook<ReturnType<typeof useShiftsInUnits>, unknown>
> => {
	const units = resolveWorkspaceUnits(
		twoBranchSchedulingWorkspace(permissions),
		"c-1",
		SHIFT_READ_KEYS,
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
	return renderHook(() => useShiftsInUnits("c-1", units), { wrapper });
};

const ok = (body: unknown): StubReply => ({
	status: 200,
	body: envelope(body),
});

describe("useShiftsInUnits", () => {
	it("given_oneDepartment_when_listed_then_readsThatDepartmentsShifts", async () => {
		const calls = stubApi({ [FRONT_OFFICE_SHIFTS]: ok([LIVE]) });
		const { result } = listShifts({ branchId: "b-1", departmentId: "d-1" }, [
			"shift:read",
		]);

		await waitFor(() => {
			expect(result.current).toEqual({ status: "ready", items: [LIVE] });
		});
		expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
			FRONT_OFFICE_SHIFTS,
		]);
	});

	it("given_aBranch_when_listed_then_readsTheCompanysShiftsInThatBranch", async () => {
		const calls = stubApi({ [COMPANY_SHIFTS]: ok([LIVE]) });
		const { result } = listShifts({ branchId: "b-1" }, ["shift:read"]);

		await waitFor(() => {
			expect(result.current).toEqual({ status: "ready", items: [LIVE] });
		});
		expect(calls.map((call) => call.search)).toEqual(["branchId=b-1"]);
	});

	it("given_everyBranch_when_listed_then_readsTheCompanysShiftsWithoutABranch", async () => {
		const calls = stubApi({ [COMPANY_SHIFTS]: ok([LIVE]) });
		const { result } = listShifts({ branchId: ALL_BRANCHES }, ["shift:read"]);

		await waitFor(() => {
			expect(result.current.status).toBe("ready");
		});
		expect(calls.map((call) => call.search)).toEqual([""]);
	});

	it("given_aRefusal_when_listed_then_isHidden", async () => {
		stubApi({ [COMPANY_SHIFTS]: problemReply(403, "ACCESS_DENIED") });
		const { result } = listShifts({ branchId: "b-1" }, ["shift:read"]);

		await waitFor(() => {
			expect(result.current.status).toBe("hidden");
		});
	});

	it("given_noReadKey_when_listed_then_isHiddenAndAsksForNothing", async () => {
		const calls = stubApi({});
		const { result } = listShifts({ branchId: "b-1" }, ["schedule:read"]);

		await waitFor(() => {
			expect(result.current.status).toBe("hidden");
		});
		expect(calls).toEqual([]);
	});
});
