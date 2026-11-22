import { useQuery } from "@tanstack/react-query";
import {
	scheduleMonthQuery,
	type ScheduleMonth,
} from "@/features/scheduling/months/api";
import {
	monthBeforeRunOf,
	monthsBeforeRunOf,
	type MonthsBeforeRun,
} from "@/features/scheduling/roster/weeksBeforeRun";

/** The months a schedule's page reads, as it uses them. */
export type RunMonths = {
	/** The Department's month of the schedule's week; none until read, or when it can't be. */
	month: ScheduleMonth | undefined;
	/** What that month and, when needed, the month before say of the weeks before the run. */
	beforeRun: MonthsBeforeRun;
};

/**
 * The Department's months a schedule's page reads: the month of its week
 * (`month`), and the month before only when a week before its run falls
 * there (`monthBeforeRunOf`). Both under `scheduleMonthQuery`, gated by
 * `allowed`; what they mean is worked out in `weeksBeforeRun.ts`.
 */
export const useRunMonths = (
	companyId: string,
	departmentId: string,
	month: string,
	firstDay: string | undefined,
	allowed: boolean
): RunMonths => {
	const monthBefore = firstDay ? monthBeforeRunOf(firstDay) : undefined;
	const ownRead = useQuery(
		scheduleMonthQuery(companyId, departmentId, month, allowed)
	);
	const beforeRead = useQuery(
		scheduleMonthQuery(
			companyId,
			departmentId,
			monthBefore ?? "",
			allowed && monthBefore !== undefined
		)
	);
	return {
		month: ownRead.data,
		beforeRun: monthsBeforeRunOf([ownRead, beforeRead]),
	};
};
