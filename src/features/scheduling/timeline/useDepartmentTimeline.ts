import { useQueries } from "@tanstack/react-query";
import type { DepartmentPath } from "@/common/companyPath";
import { ApiProblemError } from "@/common/problem";
import {
	scheduleMonthQuery,
	type ScheduleMonth,
} from "@/features/scheduling/months/api";
import { rosterFromAssignments } from "@/features/scheduling/roster/roster";
import {
	rosterRunId,
	scheduleAssignmentsQuery,
	scheduleQuery,
} from "@/features/scheduling/schedules/api";
import {
	lanesOf,
	type TimelineSchedule,
} from "@/features/scheduling/timeline/timeline";
import {
	monthsOfWindow,
	timelineRowsOf,
	timelineSchedulesOf,
	type TimelineRow,
} from "@/features/scheduling/timeline/timelineRows";
import { departmentScope } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

/** One Department's timeline as read: its schedules in the window and one row per person across them. */
export type DepartmentTimeline =
	| { status: "pending" | "error" | "hidden" }
	| {
			status: "ready";
			departmentName: string;
			branchName: string;
			/** The branch's IANA time zone, absent from an older API. */
			timeZone: string | null | undefined;
			schedules: Array<TimelineSchedule>;
			rows: Array<TimelineRow>;
	  };

/** Whether a failed read was a refusal of `schedule:read`. */
const isRefused = (error: unknown): boolean =>
	error instanceof ApiProblemError && error.status === 403;

/**
 * Reads the Department's months that cover `firstDay` to `lastDay`, then each
 * schedule touching those days and its roster, through the month, schedule
 * and assignments reads the other scheduling pages use. While a part is being
 * generated the month and that schedule are read again, as on the month and
 * schedule pages.
 */
export const useDepartmentTimeline = (
	companyId: string,
	departmentId: string,
	firstDay: string,
	lastDay: string
): DepartmentTimeline => {
	const access = useAccess();
	const allowed = access.can("schedule:read", departmentScope(departmentId));
	const months = useQueries({
		queries: monthsOfWindow(firstDay, lastDay).map((month) =>
			scheduleMonthQuery(companyId, departmentId, month, allowed)
		),
	});
	const monthsRead = months.flatMap((month) =>
		month.data ? [month.data] : []
	);
	const [firstMonth]: Array<ScheduleMonth | undefined> = monthsRead;
	const unit: DepartmentPath | undefined = firstMonth && {
		branchId: firstMonth.branchId,
		departmentId,
	};
	const schedules = lanesOf(
		timelineSchedulesOf(monthsRead),
		firstDay,
		lastDay
	).flat();
	const scheduleReads = useQueries({
		queries: schedules.map((schedule) =>
			// Read again while generating, as the schedule page does, so its roster appears once ready.
			scheduleQuery(companyId, unit, schedule.id, allowed, {
				pollWhileGenerating: true,
			})
		),
	});
	const rosterReads = useQueries({
		queries: scheduleReads.map((read, index) => {
			const runId = read.data ? rosterRunId(read.data) : undefined;
			return scheduleAssignmentsQuery(
				companyId,
				unit,
				schedules[index]!.id,
				runId ?? null,
				read.data?.rosterRevision ?? 0,
				allowed && runId !== undefined
			);
		}),
	});

	if (access.status !== "ready") return { status: access.status };
	if (!allowed || months.some((month) => isRefused(month.error)))
		return { status: "hidden" };
	if (months.some((month) => month.isError)) return { status: "error" };
	if (!firstMonth || monthsRead.length < months.length)
		return { status: "pending" };
	const period = { start: firstDay, end: lastDay };
	const rosters = rosterReads.map((read, index) => ({
		scheduleId: schedules[index]!.id,
		rows: rosterFromAssignments(read.data ?? [], period),
	}));
	return {
		status: "ready",
		departmentName: firstMonth.departmentName,
		branchName: firstMonth.branchName,
		timeZone: firstMonth.timeZone,
		schedules,
		rows: timelineRowsOf(rosters),
	};
};
