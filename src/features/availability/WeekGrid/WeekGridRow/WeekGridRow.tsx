import type { ReactNode } from "react";
import { dayColumnClasses } from "@/common/dayView";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import type { Weekday } from "@/common/weekdays";
import type { AvailabilityDay } from "@/features/availability/availabilityModel";
import { AvailabilityCell } from "@/features/availability/WeekGrid/AvailabilityCell";

export type WeekGridRowProps = {
	/** The seven days, Monday first, each with its windows. */
	days: ReadonlyArray<AvailabilityDay>;
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
		{days.map(({ day, windows }) => (
			<td
				key={day}
				className={joinClassNames(
					"px-2 py-3 align-top",
					dayColumnClasses(day, shownWeekday)
				)}
			>
				<AvailabilityCell windows={windows} />
			</td>
		))}
		{withActions && <td className="px-2 py-3 text-center">{action}</td>}
	</tr>
);
