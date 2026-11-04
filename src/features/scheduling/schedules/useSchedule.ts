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
	companyScheduleQuery,
	createSchedule,
	deleteSchedule,
	publishSchedule,
	rejectSchedule,
	requestGeneration,
	requestRegeneration,
	scheduleKey,
	schedulesKey,
	scheduleQuery,
	updateSchedule,
	type Schedule,
	type ScheduleBody,
	type SchedulePolling,
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

/**
 * `unit` or `scheduleId` undefined asks for nothing and stays pending.
 * `polling` reads it again while its generation is in progress.
 */
export const useSchedule = (
	companyId: string,
	unit: DepartmentPath | undefined,
	scheduleId: string | undefined,
	polling: SchedulePolling = {}
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
			allowed && scheduleId !== undefined,
			polling
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

/**
 * One schedule read by its id alone, wherever its Department is. `hidden`
 * when `schedule:read` is held nowhere in the company or the API refuses with
 * a 403; `missing` when the API answers 404, which is also its answer for a
 * schedule outside the Departments where the key is held. `polling` reads it
 * again while its generation is in progress.
 */
export const useCompanySchedule = (
	companyId: string,
	scheduleId: string,
	polling: SchedulePolling = {}
): ScheduleState => {
	const access = useAccess();
	const allowed = access.canAnywhere("schedule:read");
	const schedule = useQuery(
		companyScheduleQuery(companyId, scheduleId, allowed, polling)
	);

	if (access.status !== "ready") return { status: access.status };
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
type Removed = { unit: DepartmentPath; scheduleId: string };
type Decided = { unit: DepartmentPath; scheduleId: string };
type Rejected = Decided & { reason: string };

export type ScheduleActions = {
	create: UseMutationResult<Schedule, Error, Created>;
	update: UseMutationResult<Schedule, Error, Replaced>;
	generate: UseMutationResult<void, Error, Generated>;
	regenerate: UseMutationResult<void, Error, Generated>;
	remove: UseMutationResult<void, Error, Removed>;
	publish: UseMutationResult<Schedule, Error, Decided>;
	reject: UseMutationResult<Schedule, Error, Rejected>;
};

/**
 * Creating, replacing, generating, regenerating, deleting, publishing and
 * rejecting a schedule. A saved or decided schedule is cached at once from
 * the answer, so the page shows it without waiting, and every scheduling
 * query of the company reloads after each. Deleting reloads only the list,
 * so a roster still on screen isn't read again and found missing; a refused
 * regeneration, delete or decision reloads everything, so the schedule's
 * status catches up.
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
		regenerate: useMutation({
			meta: { successMessage: "scheduling.regenerate.done" },
			mutationFn: ({ unit, scheduleId }: Generated) =>
				requestRegeneration(companyId, unit, scheduleId),
			onSuccess: reload,
			onError: reload,
		}),
		remove: useMutation({
			meta: { successMessage: "scheduling.delete.done" },
			mutationFn: ({ unit, scheduleId }: Removed) =>
				deleteSchedule(companyId, unit, scheduleId),
			onSuccess: () =>
				client.invalidateQueries({ queryKey: schedulesKey(companyId) }),
			onError: reload,
		}),
		publish: useMutation({
			meta: { successMessage: "scheduling.decision.published" },
			mutationFn: ({ unit, scheduleId }: Decided) =>
				publishSchedule(companyId, unit, scheduleId),
			onSuccess: saved,
			onError: reload,
		}),
		reject: useMutation({
			meta: { successMessage: "scheduling.decision.rejected" },
			mutationFn: ({ unit, scheduleId, reason }: Rejected) =>
				rejectSchedule(companyId, unit, scheduleId, reason),
			onSuccess: saved,
			onError: reload,
		}),
	};
};
