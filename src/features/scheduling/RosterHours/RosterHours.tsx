import { useId } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import { formatDay } from "@/common/formatDay";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import {
	rosterHoursRows,
	type RosterHoursRow,
} from "@/features/scheduling/hours/rosterHoursRows";
import type { RosterHoursState } from "@/features/scheduling/hours/useRosterHours";
import { hoursFromMinutes } from "@/features/scheduling/scheduleDraft";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";

export type RosterHoursProps = {
	/** The roster's hours by person, or why they aren't shown. */
	hours: RosterHoursState;
	/** The roster's rows, which name each person and set their order. */
	assignments: ReadonlyArray<ScheduleAssignment>;
	/** The first day the schedule covers: a later part's hours count the week's earlier days too, and say so. */
	coveredFrom?: string;
	className?: string;
};

/** Hours keep one decimal at most, as on the summary line: "37.5 h". */
const HOURS_FRACTION_DIGITS = 1;

const key = "scheduling.rosterHours";

/** The total line's figures read heavier than a person's. */
const figureClasses = (row: RosterHoursRow): string | undefined =>
	row.isTotal ? "font-semibold" : undefined;

/** Overtime above zero reads in the roster's "needs a look" tone; never red, which is for errors. */
const overtimeClasses = (row: RosterHoursRow): string | undefined =>
	row.overtimeMinutes > 0
		? "font-semibold text-warning-900"
		: figureClasses(row);

/**
 * The roster's Hours section under the grid: one row per person with days
 * worked and normal, extra and overtime hours as the hours ledger classifies
 * them, then the total, and a line saying what the figures are. Read-only.
 * Phones keep the name, with every figure on its summary line, as on Job
 * titles. Nothing shows while the hours are hidden.
 */
export const RosterHours = ({
	hours,
	assignments,
	coveredFrom,
	className,
}: RosterHoursProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const titleId = useId();
	if (hours.status === "hidden") return null;
	const numbers = new Intl.NumberFormat(formattingLocale(i18n), {
		maximumFractionDigits: HOURS_FRACTION_DIGITS,
	});
	const hoursText = (minutes: number): string =>
		t(`${key}.hours`, { hours: numbers.format(hoursFromMinutes(minutes)) });
	const columns: Array<DataTableColumn<RosterHoursRow>> = [
		{
			id: "staff",
			header: t(`${key}.staff`),
			cell: (row) => row.name,
			cellClassName: "font-semibold",
			pin: "start",
		},
		{
			id: "daysWorked",
			header: t(`${key}.daysWorked`),
			cell: (row) => (
				<span className={figureClasses(row)}>
					{numbers.format(row.daysWorked)}
				</span>
			),
			summary: (row) => t(`${key}.daysWorkedCount`, { count: row.daysWorked }),
			hideBelow: "sm",
		},
		{
			id: "normal",
			header: t(`${key}.normal`),
			cell: (row) => (
				<span className={figureClasses(row)}>
					{hoursText(row.normalMinutes)}
				</span>
			),
			summary: (row) =>
				t(`${key}.normalSummary`, { hours: hoursText(row.normalMinutes) }),
			hideBelow: "sm",
		},
		{
			id: "extra",
			header: t(`${key}.extra`),
			cell: (row) => (
				<span className={figureClasses(row)}>
					{hoursText(row.extraMinutes)}
				</span>
			),
			summary: (row) =>
				t(`${key}.extraSummary`, { hours: hoursText(row.extraMinutes) }),
			hideBelow: "sm",
		},
		{
			id: "overtime",
			header: t(`${key}.overtime`),
			cell: (row) => (
				<span className={overtimeClasses(row)}>
					{hoursText(row.overtimeMinutes)}
				</span>
			),
			summary: (row) => (
				<span className={overtimeClasses(row)}>
					{t(`${key}.overtimeSummary`, {
						hours: hoursText(row.overtimeMinutes),
					})}
				</span>
			),
			hideBelow: "sm",
		},
	];
	return (
		<section
			aria-labelledby={titleId}
			className={joinClassNames("text-sm", className)}
		>
			<h2 className="font-bold text-neutral-900" id={titleId}>
				{t(`${key}.title`)}
			</h2>
			{hours.status === "ready" ? (
				<>
					{coveredFrom !== undefined &&
						hours.hours.countedFrom < coveredFrom && (
							<p className="mt-2 text-neutral-700">
								{t(`${key}.countsEarlierParts`, {
									from: formatDay(
										hours.hours.countedFrom,
										formattingLocale(i18n)
									),
								})}
							</p>
						)}
					<DataTable
						className="mt-3"
						columns={columns}
						emptyState={t(`${key}.empty`)}
						getRowId={(row) => row.key}
						label={t(`${key}.title`)}
						data={rosterHoursRows(hours.hours, assignments, {
							formerMember: t("scheduling.detail.formerMember"),
							total: t(`${key}.total`),
						})}
					/>
					<p className="mt-2 text-neutral-700">{t(`${key}.note`)}</p>
				</>
			) : (
				<p
					className="mt-2 text-neutral-800"
					role={hours.status === "error" ? "alert" : undefined}
				>
					{t(`${key}.${hours.status === "error" ? "loadFailed" : "loading"}`)}
				</p>
			)}
		</section>
	);
};
