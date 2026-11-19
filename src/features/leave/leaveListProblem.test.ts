import { describe, expect, it } from "vitest";
import { leaveListProblemOf } from "@/features/leave/leaveListProblem";
import type { LeaveList } from "@/features/leave/useLeaveRequests";

describe("leaveListProblemOf", () => {
	it.each([
		{
			list: { status: "hidden" },
			own: false,
			problem: { key: "leave.hidden", alert: false },
		},
		{
			list: { status: "error" },
			own: false,
			problem: { key: "leave.failed", alert: true },
		},
		{
			list: { status: "error" },
			own: true,
			problem: { key: "leave.myFailed", alert: true },
		},
		{ list: { status: "pending" }, own: false, problem: undefined },
		{
			list: { status: "ready", items: [], total: 0 },
			own: true,
			problem: undefined,
		},
	] as Array<{ list: LeaveList; own: boolean; problem: unknown }>)(
		"given_a_$list.status_list_own_$own_when_explained_then_says_$problem.key",
		({ list, own, problem }) => {
			expect(leaveListProblemOf(list, own)).toEqual(problem);
		}
	);
});
