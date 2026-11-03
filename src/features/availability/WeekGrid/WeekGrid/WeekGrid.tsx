import dayjs from "dayjs";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import type { AvailabilityDay } from "@/features/availability/availabilityModel";
import { WeekGridRow } from "@/features/availability/WeekGrid/WeekGridRow";
import { daysOf } from "@/features/scheduling/schedules";

/** One row of the grid: its days and, when the grid has those columns, its heading and action. */
export type WeekGridRowData = {
	id: string;
	/** The seven days, Monday first. */
	days: ReadonlyArray<AvailabilityDay>;
	heading?: ReactNode;
	action?: ReactNode;
};

export type WeekGridProps = {
	/** The table's accessible name. */
	label: string;
	/** The week shown, as its Monday; the columns are its seven dates. */
	weekStartMonday: string;
	rows: ReadonlyArray<WeekGridRowData>;
	/** The first column's header, naming each row; no such column when left out. */
	headingLabel?: string;
	/** A last column of row actions, named for assistive tech only; none when left out. */
	actionsLabel?: string;
	/** Shown across the body when there are no rows. */
	emptyState?: ReactNode;
	className?: string;
};

/**
 * A week of availability, laid out as the roster is: a column per day with
 * its weekday and date, a row per person (or one row for the caller's own
 * week), each day's windows as chips. The heading column stays in place
 * while the days scroll sideways on a narrow screen.
 */
export const WeekGrid = ({
	label,
	weekStartMonday,
	rows,
	headingLabel,
	actionsLabel,
	emptyState,
	className,
}: WeekGridProps): FunctionComponent => {
	const { i18n } = useTranslation();
	const language = i18n.resolvedLanguage ?? i18n.language;
	const weekday = new Intl.DateTimeFormat(language, { weekday: "short" });
	const dayMonth = new Intl.DateTimeFormat(language, {
		day: "numeric",
		month: "short",
	});
	const dates = daysOf(weekStartMonday);
	const withHeading = headingLabel !== undefined;
	const withActions = actionsLabel !== undefined;
	const columnCount =
		dates.length + (withHeading ? 1 : 0) + (withActions ? 1 : 0);

	return (
		<div
			className={joinClassNames(
				"relative min-w-0 overflow-x-auto rounded-lg border border-neutral-400",
				className
			)}
		>
			<table
				className={joinClassNames(
					"w-full table-fixed border-collapse text-neutral-900",
					withHeading ? "min-w-254" : "min-w-182"
				)}
			>
				<caption className="sr-only">{label}</caption>
				<colgroup>
					{withHeading && <col className="w-40 sm:w-56" />}
					{dates.map((date) => (
						<col key={date} />
					))}
					{withActions && <col className="w-16" />}
				</colgroup>
				<thead>
					<tr className="bg-neutral-200">
						{withHeading && (
							<th
								className="sticky left-0 z-10 h-16 bg-neutral-200 px-3 text-left text-sm font-bold"
								scope="col"
							>
								{headingLabel}
							</th>
						)}
						{dates.map((date) => (
							<th key={date} className="h-16 px-2 text-center" scope="col">
								<span className="block text-sm font-bold">
									{weekday.format(dayjs(date).toDate())}
								</span>
								<span className="mt-1 block text-xs font-normal">
									{dayMonth.format(dayjs(date).toDate())}
								</span>
							</th>
						))}
						{withActions && (
							<th className="h-16" scope="col">
								<span className="sr-only">{actionsLabel}</span>
							</th>
						)}
					</tr>
				</thead>
				<tbody>
					{rows.length === 0 && (
						<tr className="border-t border-neutral-400">
							<td
								className="h-16 px-3 text-center text-sm text-neutral-700"
								colSpan={columnCount}
							>
								{emptyState}
							</td>
						</tr>
					)}
					{rows.map((row) => (
						<WeekGridRow
							key={row.id}
							action={row.action}
							days={row.days}
							heading={row.heading}
							withActions={withActions}
							withHeading={withHeading}
						/>
					))}
				</tbody>
			</table>
		</div>
	);
};
