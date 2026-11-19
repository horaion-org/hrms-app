import {
	useMutation,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import { apiRequest } from "@/common/api-client";
import type { DepartmentPath } from "@/common/companyPath";
import {
	deletedScheduleKey,
	DELETED_SCHEDULES_KEY_PART,
} from "@/features/scheduling/history/deletedSchedule";
import {
	schedulePath,
	SCHEDULING_QUERY_ROOT,
} from "@/features/scheduling/paths";
import {
	scheduleKey,
	scheduleSchema,
	type Schedule,
} from "@/features/scheduling/schedules/api";
import type { DeletedSchedule } from "@/features/scheduling/schedules/deletedSchedules";
import { useReloadScheduling } from "@/features/scheduling/schedules/useSchedule";
import { departmentScope } from "@/features/workspace/scopes";
import type { Access } from "@/features/workspace/useAccess";

/*
 * Putting a deleted roster back on the roster page: the one thing that can be
 * done to a schedule in History, and only while its days are still empty,
 * which the API decides.
 */

/** The statuses a deleted schedule can be put back in; it comes back as it was. */
const PUT_BACK_STATUSES: ReadonlyArray<Schedule["status"]> = [
	"GENERATED",
	"REJECTED",
];

/**
 * Whether "Put back on the roster" is offered on a deleted schedule: only one
 * a manager deleted (one a later run replaced has that run's roster on its
 * days, and an unrecorded cause can't be told apart from it), only with a
 * roster (generated or rejected), and only with `schedule:delete` at its
 * Department: whoever may delete may undo it.
 */
export const mayPutBack = (
	schedule: Pick<DeletedSchedule, "deletion" | "status" | "departmentId">,
	access: Pick<Access, "can">
): boolean =>
	schedule.deletion.cause === "MANAGER" &&
	PUT_BACK_STATUSES.includes(schedule.status) &&
	access.can("schedule:delete", departmentScope(schedule.departmentId));

/**
 * Puts a deleted schedule back at its Department. It answers the schedule,
 * live again in the status it had; the API refuses with 409 when a run
 * replaced it or its days hold another roster, and 404 when it is not in
 * History (any more).
 */
export const putBackSchedule = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string
): Promise<Schedule> =>
	apiRequest(
		`${schedulePath(companyId, unit, scheduleId)}/restoration`,
		scheduleSchema,
		{ method: "POST" }
	);

type PutBack = { unit: DepartmentPath; scheduleId: string };

/**
 * Putting a deleted schedule back. The schedule is cached at once from the
 * answer, and every other scheduling read of the company reloads: the live
 * and deleted lists, the months and the timeline. The deleted record itself
 * is only marked out of date, so one still on screen isn't read again and
 * found missing. A refusal reloads everything, so History catches up.
 */
export const usePutBack = (
	companyId: string
): UseMutationResult<Schedule, Error, PutBack> => {
	const client = useQueryClient();
	const reload = useReloadScheduling(companyId);
	return useMutation({
		meta: { successMessage: "scheduling.history.putBack.done" },
		mutationFn: ({ unit, scheduleId }: PutBack) =>
			putBackSchedule(companyId, unit, scheduleId),
		onSuccess: async (schedule) => {
			client.setQueryData(
				scheduleKey(companyId, schedule.scheduleId),
				schedule
			);
			await Promise.all([
				client.invalidateQueries({
					queryKey: deletedScheduleKey(companyId, schedule.scheduleId),
					refetchType: "none",
				}),
				client.invalidateQueries({
					queryKey: [SCHEDULING_QUERY_ROOT, companyId],
					predicate: (query) =>
						query.queryKey[2] !== DELETED_SCHEDULES_KEY_PART,
				}),
			]);
		},
		onError: reload,
	});
};
