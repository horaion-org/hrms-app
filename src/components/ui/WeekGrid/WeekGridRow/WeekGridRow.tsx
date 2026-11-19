import type { ReactNode } from "react";
import { dayColumnClasses } from "@/common/dayView";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import type { Weekday } from "@/common/weekdays";

/** One day's cell of a week grid: its weekday and what it shows. */
export type WeekGridDay = { day: Weekday; cell: ReactNode };

export type WeekGridRowProps = {
	/** The seven days, Monday first, each with its cell. */
	days: ReadonlyArray<WeekGridDay>;
	/** Whether the grid has a heading column, so the row draws its header cell. */
	withHeading?: boolean;
	/** Names the row, e.g. a member. */
	heading?: ReactNode;
	/** Whether the grid has an actions column, so the row keeps its cell even without an action. */
	withActions?: boolean;
	/** The row's action, e.g. editing it. */
	action?: ReactNode;
	/** The one weekday shown below `md`, as the grid's `shownDay` falls; every day when left out. */
	shownWeekday?: Weekday;
};

/** One row of a week grid: an optional heading, a cell per day and an optional action. */
export const WeekGridRow = ({
	days,
	withHeading = false,
	heading,
	withActions = false,
	action,
	shownWeekday,
}: WeekGridRowProps): FunctionComponent => (
	<tr className="border-t border-neutral-400">
		{withHeading && (
			<th
				className="sticky left-0 z-10 bg-neutral-50 px-3 py-3 text-left font-normal"
				scope="row"
			>
				{heading}
			</th>
		)}
		{days.map(({ day, cell }) => (
			<td
				key={day}
				className={joinClassNames(
					"px-2 py-3 align-top",
					dayColumnClasses(day, shownWeekday)
				)}
			>
				{cell}
			</td>
		))}
		{withActions && <td className="px-2 py-3 text-center">{action}</td>}
	</tr>
);
