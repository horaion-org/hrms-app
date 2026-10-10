import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
import type { DepartmentPath } from "@/features/scheduling/paths";
import {
	createSchedule,
	scheduleKey,
	scheduleQuery,
	updateSchedule,
	type Schedule,
	type ScheduleBody,
} from "@/features/scheduling/schedules/api";
import { workspaceQuery } from "@/features/workspace/api";
import { retry } from "@/features/workspace/retry";
import { useCanAnywhere } from "@/features/workspace/useCan";

/**
 * One schedule's setup. `hidden` when the person's grants don't
 * reach schedules anywhere, whether the workspace says so up front or the
 * API refuses with a 403; `missing` when the API has no such schedule for
 * them.
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
	const workspace = useQuery({ ...workspaceQuery, retry });
	const allowed =
		useCanAnywhere()(["schedule:read"]) && scheduleId !== undefined;
	const schedule = useQuery(
		scheduleQuery(companyId, unit, scheduleId ?? "", allowed)
	);

	if (workspace.isPending || scheduleId === undefined)
		return { status: "pending" };
	if (workspace.isError) return { status: "error" };
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

export type ScheduleActions = {
	create: UseMutationResult<Schedule, Error, Created>;
	update: UseMutationResult<Schedule, Error, Replaced>;
};

/**
 * Creating and replacing a schedule. The answer is cached at once, so the
 * next step shows it without waiting, and every scheduling query of the
 * company reloads.
 */
export const useScheduleActions = (companyId: string): ScheduleActions => {
	const client = useQueryClient();
	const saved = async (schedule: Schedule): Promise<void> => {
		client.setQueryData(scheduleKey(companyId, schedule.scheduleId), schedule);
		await client.invalidateQueries({ queryKey: ["scheduling", companyId] });
	};
	return {
		create: useMutation({
			mutationFn: ({ unit, body }: Created) =>
				createSchedule(companyId, unit, body),
			onSuccess: saved,
		}),
		update: useMutation({
			mutationFn: ({ unit, scheduleId, body }: Replaced) =>
				updateSchedule(companyId, unit, scheduleId, body),
			onSuccess: saved,
		}),
	};
};
