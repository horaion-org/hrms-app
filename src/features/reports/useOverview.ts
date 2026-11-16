import {
	comingTwoWeeks,
	lastAndThisMonth,
	monthDays,
	nextMonday,
	pastTwoWeeks,
	thisAndNextMonth,
} from "@/features/dashboard/dashboardDates";
import type { GuardedRead } from "@/features/dashboard/guardedRead";
import type { OverviewSection } from "@/features/dashboard/homeSections";
import {
	overviewOf,
	type Overview,
	type OverviewGrouping,
} from "@/features/reports/overview";
import { useNextRoster } from "@/features/dashboard/useDashboardReads";
import {
	useReportOvertime,
	useReportShortages,
	useReportStaffing,
	useRosterChanges,
} from "@/features/reports/useReportsReads";
import type { BranchChoice } from "@/features/workspace/unitChoices";

/** Which Branch the Overview is of, and the Branches it can name. */
export type OverviewUnits = {
	/** The Branch in view; undefined across every Branch in reach. */
	branch: BranchChoice | undefined;
	branches: ReadonlyArray<BranchChoice>;
};

/** A read's rows, or none where it has not answered or is out of reach. */
const rowsOf = <T>(read: GuardedRead<Array<T>>): Array<T> =>
	read.status === "ready" ? read.data : [];

/**
 * The Overview for the units in view: Branches compared across the company,
 * Departments within one Branch. It waits for the shortages and the rules,
 * its lead figures; a read that fails or is out of reach counts as nothing,
 * so the rest still shows. A section the person hid is not read for. Every
 * figure is read under `report:read` except next week's rosters, which only
 * someone who may read rosters is told about.
 */
export const useOverview = (
	companyId: string,
	{ branch, branches }: OverviewUnits,
	shown: (section: OverviewSection) => boolean
): GuardedRead<Overview> => {
	const now = new Date();
	const units = { branchId: branch?.branchId };
	const grouping: OverviewGrouping = branch ? "department" : "branch";
	const any =
		shown("overview-figures") ||
		shown("overview-units") ||
		shown("overview-causes");
	const figures = shown("overview-figures");
	const figuresOrUnits = figures || shown("overview-units");

	const shortages = useReportShortages(
		companyId,
		units,
		comingTwoWeeks(now),
		any
	);
	const shortagesBefore = useReportShortages(
		companyId,
		units,
		pastTwoWeeks(now),
		figures
	);
	const staffing = useReportStaffing(
		companyId,
		units,
		comingTwoWeeks(now),
		any
	);
	const overtime = useReportOvertime(
		companyId,
		units,
		lastAndThisMonth(now),
		figuresOrUnits
	);
	const nextRoster = useNextRoster(
		companyId,
		units,
		thisAndNextMonth(now),
		nextMonday(now),
		figuresOrUnits
	);
	const changes = useRosterChanges(
		companyId,
		units,
		monthDays(now),
		figuresOrUnits
	);
	const changesBefore = useRosterChanges(
		companyId,
		units,
		monthDays(now, 1),
		figures
	);

	if (shortages.status !== "ready") return shortages;
	if (staffing.status === "pending") return { status: "pending" };
	return {
		status: "ready",
		data: overviewOf({
			shortages: shortages.data,
			shortagesBefore: rowsOf(shortagesBefore),
			rules: rowsOf(staffing),
			overtime: overtime.status === "ready" ? overtime.data.departments : [],
			thisMonth: lastAndThisMonth(now).to,
			nextRoster: rowsOf(nextRoster),
			rostersInReach: nextRoster.status !== "hidden",
			changes: rowsOf(changes),
			changesBefore: rowsOf(changesBefore),
			grouping,
			branchNameOf: (branchId) =>
				branches.find((each) => each.branchId === branchId)?.name,
		}),
	};
};
