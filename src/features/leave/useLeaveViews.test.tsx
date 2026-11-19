import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { companyWideWorkspace } from "@/common/testing/effectiveWorkspace";
import type { FunctionComponent } from "@/common/types";
import { useLeaveViews } from "@/features/leave/useLeaveRequests";
import {
	myProfileQuery,
	type MemberProfileDetail,
} from "@/features/people/api";
import { workspaceQuery } from "@/features/workspace/api";

// The hook reads the signed-in member from the route context; this test has no router.
vi.mock("@/features/workspace/useCurrentCompany", () => ({
	useCurrentCompanyId: (): string => "c-1",
	useCurrentMembershipId: (): string => "m-c-1",
}));

/** The caller's own profile, with only how part-time is said varied. */
const profileOf = ({
	partTime,
	employmentType,
}: Pick<
	MemberProfileDetail,
	"partTime" | "employmentType"
>): MemberProfileDetail => ({
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
	partTime,
	hireDate: "2026-01-05",
	probationEndDate: null,
	endDate: null,
	reportsTo: null,
	invitationPending: false,
});

/** The hook's answer for a profile and workspace already read. */
const viewsFor = (
	profile: Pick<MemberProfileDetail, "partTime" | "employmentType">,
	keys: Array<string>
): ReturnType<typeof useLeaveViews> => {
	const client = new QueryClient();
	client.setQueryData(workspaceQuery.queryKey, companyWideWorkspace(keys));
	client.setQueryData(myProfileQuery("c-1").queryKey, profileOf(profile));
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
	/** Own leave for anyone not known to be part-time (the terms' flag, else an old label); team views with a read key. */
	it.each([
		{
			partTime: false,
			employmentType: null,
			keys: [],
			mine: true,
			team: false,
		},
		{
			partTime: false,
			employmentType: null,
			keys: ["leave_request:read"],
			mine: true,
			team: true,
		},
		{
			partTime: true,
			employmentType: null,
			keys: [],
			mine: false,
			team: false,
		},
		{
			partTime: true,
			employmentType: null,
			keys: ["leave_request:read"],
			mine: false,
			team: true,
		},
		{ partTime: null, employmentType: null, keys: [], mine: true, team: false },
		{
			partTime: undefined,
			employmentType: null,
			keys: ["leave_request:read"],
			mine: true,
			team: true,
		},
		{
			partTime: undefined,
			employmentType: "PART_TIME",
			keys: [],
			mine: false,
			team: false,
		},
	] as const)(
		"given_flag_$partTime_label_$employmentType_holding_$keys_when_asked_then_mine_$mine_team_$team",
		({ partTime, employmentType, keys, mine, team }) => {
			expect(viewsFor({ partTime, employmentType }, [...keys])).toEqual({
				status: "ready",
				mine,
				team,
			});
		}
	);
});
