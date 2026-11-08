import { useQuery } from "@tanstack/react-query";
import {
	approvalInstanceQuery,
	subjectApprovalsQuery,
	type ApprovalInstance,
} from "@/features/approvals/api";
import {
	currentInstanceOf,
	type ApprovalRead,
} from "@/features/approvals/approvalStanding";
import { hasRoster, type Schedule } from "@/features/scheduling/schedules/api";
import { departmentScope } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

export type ScheduleApproval = {
	read: ApprovalRead;
	/** The roster's current submission, once read; with the caller's `canDecide`. */
	instance: ApprovalInstance | undefined;
	/** Reads it again after a failure. */
	retry: () => void;
};

/**
 * The approval of a schedule's current roster, for someone holding
 * `approval:read` at its department: its submissions, then the newest one
 * since the roster's latest generation read on its own, which adds whether
 * the caller may decide it now. Unread without the key, or before there is
 * a roster.
 */
export const useScheduleApproval = (
	companyId: string,
	schedule: Schedule | undefined
): ScheduleApproval => {
	const access = useAccess();
	const allowed =
		schedule !== undefined &&
		hasRoster(schedule) &&
		access.can("approval:read", departmentScope(schedule.departmentId));
	const list = useQuery(
		subjectApprovalsQuery(companyId, schedule?.scheduleId ?? "", allowed)
	);
	const current = list.data
		? currentInstanceOf(list.data, schedule?.generationRequestedAt ?? null)
		: undefined;
	const one = useQuery(
		approvalInstanceQuery(companyId, current?.approvalInstanceId)
	);
	const retry = (): void => {
		void list.refetch();
		if (current) void one.refetch();
	};
	if (!allowed)
		return { read: { status: "unread" }, instance: undefined, retry };
	if (list.isError || one.isError)
		return { read: { status: "failed" }, instance: undefined, retry };
	if (list.data === undefined)
		return { read: { status: "loading" }, instance: undefined, retry };
	if (current === null)
		return {
			read: { status: "ready", instance: null },
			instance: undefined,
			retry,
		};
	if (one.data === undefined)
		return { read: { status: "loading" }, instance: undefined, retry };
	return {
		read: { status: "ready", instance: one.data },
		instance: one.data,
		retry,
	};
};
