import { useTranslation } from "react-i18next";
import { formatDay } from "@/common/formatDay";
import { formattingLocale } from "@/common/formattingLocale";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import type { MyRosterDay } from "@/features/scheduling/myRoster/myRosterDays";
import {
	dayWithoutShiftPlainText,
	dayWithoutShiftTileText,
	leavePortionTimeText,
	shiftTimeText,
	type RosterCell,
} from "@/features/scheduling/roster/roster";
import {
	rosterLooks,
	shiftTileStyle,
} from "@/features/scheduling/roster/rosterLooks";

export type MyRosterDayListProps = {
	/** Each day shown, in order, with the caller's own tile or none (`myRosterDaysFrom`). */
	days: ReadonlyArray<MyRosterDay>;
	className?: string;
};

const key = "scheduling.myRoster.days";

/**
 * A day's tile, drawn as the roster grid draws it but not chosen: a shift on
 * its shift's colour with its time, name and role; a day off, rest day or
 * leave on the Off or Leave look with the grid's words.
 */
const DayTile = ({ cell }: { cell: RosterCell }): FunctionComponent => {
	const { t } = useTranslation();
	if (cell.kind === "shift")
		return (
			<span
				className="block rounded border px-2 py-2 text-xs font-medium text-neutral-900"
				style={shiftTileStyle(cell.colour)}
			>
				<span className="block font-semibold tabular-nums">
					{shiftTimeText(cell, t)}
				</span>
				<span className="mt-1 block">{cell.name}</span>
				<span className="block">{cell.role}</span>
			</span>
		);
	return (
		<span
			className={joinClassNames(
				"flex h-14 flex-col items-center justify-center rounded border px-1 text-center text-xs font-medium",
				cell.kind === "leave" ? rosterLooks.leave : rosterLooks.off
			)}
		>
			{/* The tile's capitals are read in plain words instead, as the grid's label says them. */}
			<span aria-hidden="true">{dayWithoutShiftTileText(cell, t)}</span>
			{cell.kind === "leave" && cell.leavePortion && (
				<span aria-hidden="true">
					{leavePortionTimeText(cell.leavePortion, t)}
				</span>
			)}
			<span className="sr-only">{dayWithoutShiftPlainText(cell, t)}</span>
		</span>
	);
};

/**
 * The caller's own days, one row each: the date, the department whose roster
 * it is on, and the day's tile; a day no published roster covers for them
 * says so in a muted line.
 */
export const MyRosterDayList = ({
	days,
	className,
}: MyRosterDayListProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	return (
		<ol
			aria-label={t(`${key}.listLabel`)}
			className={joinClassNames(
				"flex flex-col divide-y divide-neutral-400 rounded-lg border border-neutral-400",
				className
			)}
		>
			{days.map((day) => (
				<li
					key={day.date}
					className="grid grid-cols-[8rem_minmax(0,16rem)] items-center gap-4 px-4 py-3"
				>
					<span className="flex flex-col">
						<span className="text-sm font-semibold text-neutral-900">
							{formatDay(day.date, language)}
						</span>
						{day.roster && (
							<span className="text-xs text-neutral-700">
								{day.roster.departmentName}
							</span>
						)}
					</span>
					{day.cell ? (
						<DayTile cell={day.cell} />
					) : (
						<span className="text-sm text-neutral-700">
							{t(`${key}.noRoster`)}
						</span>
					)}
				</li>
			))}
		</ol>
	);
};
