import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
import {
	SCHEDULING_QUERY_ROOT,
	type DepartmentPath,
} from "@/features/scheduling/paths";
import {
	createSchedule,
	requestGeneration,
	scheduleKey,
	scheduleQuery,
	updateSchedule,
	type Schedule,
	type ScheduleBody,
} from "@/features/scheduling/schedules/api";
import { departmentScope } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

/**
 * One schedule. `hidden` when `schedule:read` isn't held at its Department,
 * whether the workspace says so up front or the API refuses with a 403;
 * `missing` when the API has no such schedule for the caller.
 */
export type ScheduleState =
	| { status: "pending" | "error" | "hidden" | "missing" }
	| { status: "ready"; schedule: Schedule };

const refused = (error: unknown, status: number): boolean =>
	error instanceof ApiProblemError && error.status === status;

/** `unit` or `scheduleId` undefined asks for nothing and stays pending. */
export const useSchedule = (
	companyId: string,
	unit: DepartmentPath | undefined,
	scheduleId: string | undefined
): ScheduleState => {
	const access = useAccess();
	const allowed =
		unit !== undefined &&
		access.can("schedule:read", departmentScope(unit.departmentId));
	const schedule = useQuery(
		scheduleQuery(
			companyId,
			unit,
			scheduleId ?? "",
			allowed && scheduleId !== undefined
		)
	);

	if (access.status !== "ready") return { status: access.status };
	if (unit === undefined || scheduleId === undefined)
		return { status: "pending" };
	if (!allowed) return { status: "hidden" };
	if (schedule.data !== undefined)
		return { status: "ready", schedule: schedule.data };
	if (refused(schedule.error, 403)) return { status: "hidden" };
	if (refused(schedule.error, 404)) return { status: "missing" };
	if (schedule.isError) return { status: "error" };
	return { status: "pending" };
};

type Created = { unit: DepartmentPath; body: ScheduleBody };
type Replaced = Created & { scheduleId: string };
type Generated = { unit: DepartmentPath; scheduleId: string };

export type ScheduleActions = {
	create: UseMutationResult<Schedule, Error, Created>;
	update: UseMutationResult<Schedule, Error, Replaced>;
	generate: UseMutationResult<void, Error, Generated>;
};

/**
 * Creating, replacing and generating a schedule. A saved schedule is cached
 * at once, so the next step shows it without waiting, and every scheduling
 * query of the company reloads after each.
 */
export const useScheduleActions = (companyId: string): ScheduleActions => {
	const client = useQueryClient();
	const reload = (): Promise<void> =>
		client.invalidateQueries({
			queryKey: [SCHEDULING_QUERY_ROOT, companyId],
		});
	const saved = async (schedule: Schedule): Promise<void> => {
		client.setQueryData(scheduleKey(companyId, schedule.scheduleId), schedule);
		await reload();
	};
	return {
		create: useMutation({
			mutationFn: ({ unit, body }: Created) =>
				createSchedule(companyId, unit, body),
			onSuccess: saved,
		}),
		update: useMutation({
			meta: { successMessage: false },
			mutationFn: ({ unit, scheduleId, body }: Replaced) =>
				updateSchedule(companyId, unit, scheduleId, body),
			onSuccess: saved,
		}),
		generate: useMutation({
			meta: { successMessage: false },
			mutationFn: ({ unit, scheduleId }: Generated) =>
				requestGeneration(companyId, unit, scheduleId),
			onSuccess: reload,
		}),
	};
};
