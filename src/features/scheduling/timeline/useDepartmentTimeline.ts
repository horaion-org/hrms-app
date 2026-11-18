import { useQueries } from "@tanstack/react-query";
import type { DepartmentPath } from "@/common/companyPath";
import { ApiProblemError } from "@/common/problem";
import {
	scheduleMonthQuery,
	type ScheduleMonth,
	type WeekPart,
} from "@/features/scheduling/months/api";
import { rosterFromAssignments } from "@/features/scheduling/roster/roster";
import {
	rosterRunId,
	type Schedule,
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
	rostersReadOf,
	type RosterReadStep,
	type RostersRead,
	type TimelinePiece,
	timelinePiecesOf,
	timelineSchedulesOf,
	type TimelineRow,
	weekPartsOf,
} from "@/features/scheduling/timeline/timelineRows";
import { mayDeleteSchedule } from "@/features/scheduling/schedules/scheduleActions";
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
			/** Whether every schedule's roster is read, still loading, or could not be read. */
			rosters: RostersRead;
			/**
			 * Each schedule read so far that the person may delete under the roster
			 * page's rule (`mayDeleteSchedule`), with its week's parts, as the delete
			 * dialog takes them; by schedule id.
			 */
			deleteTargets: Record<string, DeleteTarget>;
			/** Every schedule read so far, with its week's parts and its month, as its actions take them; by schedule id. */
			pieces: Record<string, TimelinePiece>;
	  };

/** What the delete dialog needs of one schedule: the schedule itself and its week's parts. */
export type DeleteTarget = { schedule: Schedule; weekParts: Array<WeekPart> };

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
	const runIds = scheduleReads.map((read) =>
		read.data ? rosterRunId(read.data) : undefined
	);
	const rosterReads = useQueries({
		queries: scheduleReads.map((read, index) => {
			const runId = runIds[index];
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
	const rosterSteps = scheduleReads.map((read, index): RosterReadStep => {
		const rosterRead = rosterReads[index]!;
		if (read.isError || rosterRead.isError) return "failed";
		const rosterPending = runIds[index] !== undefined && rosterRead.isPending;
		return read.isPending || rosterPending ? "pending" : "done";
	});
	return {
		status: "ready",
		departmentName: firstMonth.departmentName,
		branchName: firstMonth.branchName,
		timeZone: firstMonth.timeZone,
		schedules,
		rows: timelineRowsOf(rosters),
		rosters: rostersReadOf(rosterSteps),
		deleteTargets: Object.fromEntries(
			scheduleReads.flatMap((read) =>
				read.data && mayDeleteSchedule(read.data, access)
					? [
							[
								read.data.scheduleId,
								{
									schedule: read.data,
									weekParts: weekPartsOf(monthsRead, read.data.periodStart),
								},
							],
						]
					: []
			)
		),
		pieces: timelinePiecesOf(
			scheduleReads.flatMap((read) => (read.data ? [read.data] : [])),
			monthsRead
		),
	};
};
