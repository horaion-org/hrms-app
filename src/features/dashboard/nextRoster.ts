import type {
	ScheduleMonthSummary,
	WeekState,
} from "@/features/scheduling/months/api";
import type {
	ReadinessGap,
	SchedulingReadiness,
} from "@/features/scheduling/readiness/api";

/*
 * The Next roster card's rows: for each Department in reach, the state of
 * the coming week and the one step it waits on. Pure, so the card only
 * renders what this decides.
 */

/** The one thing the coming week waits on. */
export type NextRosterStep =
	"setUp" | "generate" | "wait" | "review" | "fix" | "carryOn" | "done";

/** One Department's coming week. */
export type NextRosterRow = {
	branchId: string;
	departmentId: string;
	departmentName: string;
	/** The coming week's state; NOT_GENERATED when no schedule names it. */
	state: WeekState;
	/** The week's live schedule, or null when it has none. */
	scheduleId: string | null;
	step: NextRosterStep;
	/** What the Department lacks before a schedule could roster anyone; empty when ready or not known. */
	missing: Array<ReadinessGap>;
};

/** The step each week state waits on, once the Department is ready. */
const STEP_OF_STATE: Record<WeekState, NextRosterStep> = {
	PUBLISHED: "done",
	TO_REVIEW: "review",
	TENTATIVE: "review",
	GENERATING: "wait",
	FAILED: "fix",
	REJECTED: "fix",
	DRAFT: "carryOn",
	NOT_GENERATED: "generate",
	UNKNOWN: "generate",
};

/** The coming week's state and schedule in one Department's months; not generated when none names it. */
const comingWeekOf = (
	summaries: ReadonlyArray<ScheduleMonthSummary>,
	comingMonday: string
): { state: WeekState; scheduleId: string | null } => {
	for (const summary of summaries) {
		const week = summary.weeks.find(
			(candidate) => candidate.periodStart === comingMonday
		);
		if (week) return { state: week.state, scheduleId: week.scheduleId };
	}
	return { state: "NOT_GENERATED", scheduleId: null };
};

/** The Departments whose coming week still waits on something: every one not yet published. */
export const rostersToDo = (
	rows: ReadonlyArray<NextRosterRow>
): Array<NextRosterRow> => rows.filter((row) => row.step !== "done");

/**
 * Every Department the month summaries or readiness name, by name: the
 * coming week's state and its step. A Department not ready to schedule
 * waits on its set-up first, whatever its week says.
 */
export const nextRosterRows = (
	summaries: ReadonlyArray<ScheduleMonthSummary>,
	readiness: ReadonlyArray<SchedulingReadiness>,
	comingMonday: string
): Array<NextRosterRow> => {
	const departments = new Map<
		string,
		{ branchId: string; departmentName: string }
	>();
	for (const unit of [...summaries, ...readiness])
		departments.set(unit.departmentId, {
			branchId: unit.branchId,
			departmentName: unit.departmentName,
		});

	return [...departments.entries()]
		.map(([departmentId, unit]) => {
			const week = comingWeekOf(
				summaries.filter((summary) => summary.departmentId === departmentId),
				comingMonday
			);
			const ready = readiness.find((row) => row.departmentId === departmentId);
			const missing = ready && !ready.ready ? ready.missing : [];
			return {
				...unit,
				departmentId,
				...week,
				step: missing.length > 0 ? "setUp" : STEP_OF_STATE[week.state],
				missing,
			} satisfies NextRosterRow;
		})
		.sort((first, second) =>
			first.departmentName.localeCompare(second.departmentName)
		);
};
