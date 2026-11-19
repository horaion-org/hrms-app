import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { companyWideWorkspace } from "@/common/testing/effectiveWorkspace";
import type { FunctionComponent } from "@/common/types";
import { useLeaveViews } from "@/features/leave/useLeaveRequests";
import {
	myProfileQuery,
	type EmploymentType,
	type MemberProfileDetail,
} from "@/features/people/api";
import { workspaceQuery } from "@/features/workspace/api";

// The hook reads the signed-in member from the route context; this test has no router.
vi.mock("@/features/workspace/useCurrentCompany", () => ({
	useCurrentCompanyId: (): string => "c-1",
	useCurrentMembershipId: (): string => "m-c-1",
}));

/** The caller's own profile, with only the employment type varied. */
const profileOf = (
	employmentType: EmploymentType | null
): MemberProfileDetail => ({
	membershipId: "m-c-1",
	employeeCode: "EMP-1",
	displayName: "José",
	email: "jose@acme.test",
	phone: null,
	branchId: "b-1",
	branchName: "Orchard",
	departmentId: null,
	departmentName: null,
	jobTitleId: null,
	jobTitleName: null,
	status: "ACTIVE",
	dateOfBirth: null,
	employmentType,
	hireDate: "2026-01-05",
	probationEndDate: null,
	endDate: null,
	reportsTo: null,
	invitationPending: false,
});

/** The hook's answer for a profile and workspace already read. */
const viewsFor = (
	employmentType: EmploymentType | null,
	keys: Array<string>
): ReturnType<typeof useLeaveViews> => {
	const client = new QueryClient();
	client.setQueryData(workspaceQuery.queryKey, companyWideWorkspace(keys));
	client.setQueryData(
		myProfileQuery("c-1").queryKey,
		profileOf(employmentType)
	);
	const wrapper = ({
		children,
	}: {
		children: ReactNode;
	}): FunctionComponent => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	return renderHook(() => useLeaveViews(), { wrapper }).result.current;
};

describe("useLeaveViews", () => {
	/** Own leave for anyone but a part-timer (unknown counts as not); the team views with a read key. */
	it.each([
		{ type: "FULL_TIME", keys: [], mine: true, team: false },
		{ type: "FULL_TIME", keys: ["leave_request:read"], mine: true, team: true },
		{ type: "PART_TIME", keys: [], mine: false, team: false },
		{
			type: "PART_TIME",
			keys: ["leave_request:read"],
			mine: false,
			team: true,
		},
		{ type: null, keys: [], mine: true, team: false },
		{ type: null, keys: ["leave_request:read"], mine: true, team: true },
	] as const)(
		"given_a_$type_member_holding_$keys_when_asked_then_mine_$mine_team_$team",
		({ type, keys, mine, team }) => {
			expect(viewsFor(type, [...keys])).toEqual({
				status: "ready",
				mine,
				team,
			});
		}
	);
});
