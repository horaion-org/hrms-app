import {
	useMutation,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import {
	cancelLeaveDay,
	changeLeaveDay,
	leaveKeys,
	recordLeave,
	type LeaveRequest,
} from "@/features/leave/api";
import type { RosterChangeTarget } from "@/features/scheduling/rosterChanges/useRosterChangeActions";
import { scheduleKey } from "@/features/scheduling/schedules/api";

/** Whose leave, on which day, and the remark every leave move requires. */
type LeaveDay = { membershipId: string; day: string; remark: string };

/** A day of an approved request. */
type RequestDay = LeaveDay & { leaveRequestId: string };

export type RosterLeaveActions = {
	/** Records one day of approved leave; takes the member off any shift that day. */
	putOnLeave: UseMutationResult<
		LeaveRequest,
		Error,
		LeaveDay & { leaveType: string }
	>;
	changeType: UseMutationResult<
		LeaveRequest,
		Error,
		RequestDay & { leaveType: string }
	>;
	cancelDay: UseMutationResult<LeaveRequest, Error, RequestDay>;
	/** The same, as the first of two steps: the roster edit that follows confirms the move. */
	cancelDayFirst: UseMutationResult<LeaveRequest, Error, RequestDay>;
};

/**
 * The roster's leave moves, each a call to Leave. The roster then re-reads, so
 * what the leave records say shows at once; the Leave page's reads refresh too.
 */
export const useRosterLeaveActions = ({
	companyId,
	scheduleId,
}: RosterChangeTarget): RosterLeaveActions => {
	const client = useQueryClient();
	const refresh = async (): Promise<void> => {
		await Promise.all([
			client.invalidateQueries({
				queryKey: scheduleKey(companyId, scheduleId),
			}),
			client.invalidateQueries({ queryKey: leaveKeys.all(companyId) }),
		]);
	};
	const cancel = ({
		membershipId,
		leaveRequestId,
		day,
		remark,
	}: RequestDay): Promise<LeaveRequest> =>
		cancelLeaveDay(companyId, membershipId, leaveRequestId, day, remark);
	return {
		putOnLeave: useMutation({
			meta: { successMessage: "scheduling.rosterEdit.leaveChanged" },
			mutationFn: ({
				membershipId,
				day,
				leaveType,
				remark,
			}: LeaveDay & { leaveType: string }) =>
				recordLeave(companyId, membershipId, {
					leaveType,
					startDate: day,
					endDate: day,
					remark,
					takeOffRosteredDays: true,
				}),
			onSuccess: refresh,
		}),
		changeType: useMutation({
			meta: { successMessage: "scheduling.rosterEdit.leaveChanged" },
			mutationFn: ({
				membershipId,
				leaveRequestId,
				day,
				leaveType,
				remark,
			}: RequestDay & { leaveType: string }) =>
				changeLeaveDay(companyId, membershipId, leaveRequestId, day, {
					leaveType,
					remark,
				}),
			onSuccess: refresh,
		}),
		cancelDay: useMutation({
			meta: { successMessage: "scheduling.rosterEdit.leaveChanged" },
			mutationFn: cancel,
			onSuccess: refresh,
		}),
		cancelDayFirst: useMutation({
			meta: { successMessage: false },
			mutationFn: cancel,
			onSuccess: refresh,
		}),
	};
};
