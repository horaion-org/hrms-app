import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDay } from "@/common/formatDay";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { weekdayOf } from "@/common/weekdays";
import { Callout } from "@/components/ui/Callout";
import { Skeleton } from "@/components/ui/Skeleton";
import { WeekGrid } from "@/components/ui/WeekGrid";
import type {
	PreferenceDay,
	PreferredShift,
} from "@/features/shiftPreferences/api";
import { PreferredShiftsCell } from "@/features/shiftPreferences/PreferredShiftsCell";
import { ShiftPreferenceDialog } from "@/features/shiftPreferences/ShiftPreferenceDialog";
import { shiftPreferenceRefusal } from "@/features/shiftPreferences/shiftPreferenceRefusal";
import {
	useMyPreferenceWeek,
	useReplaceMyPreferenceDay,
} from "@/features/shiftPreferences/useShiftPreferences";

export type MyShiftPreferencesProps = {
	companyId: string;
	/** The week shown, as its Monday. */
	weekStartMonday: string;
	/** The one day shown below `md`, as the page's `DaySwitcher` picks it. */
	shownDay?: string;
	/** The week has ended, so none of it can be changed. */
	weekEnded?: boolean;
	className?: string;
};

const key = "shiftPreferences";

/** Why some of the week can't be changed: it has ended, or days lie outside the open window; none when all are open. */
const closedDaysNoteKey = (
	days: ReadonlyArray<PreferenceDay>,
	weekEnded: boolean
): "shiftPreferences.pastWeek" | "shiftPreferences.outOfReach" | undefined => {
	if (weekEnded) return "shiftPreferences.pastWeek";
	if (days.some((day) => !day.editable)) return "shiftPreferences.outOfReach";
	return undefined;
};

/** A day's chosen shifts. */
const preferredShifts = (day: PreferenceDay): Array<PreferredShift> =>
	day.shifts.filter((shift) => shift.preferred);

/**
 * The caller's own week as one row of seven days, each day's preferred shifts
 * as chips; an open day is one button that opens its dialog. Saves straight
 * away through their own routes: nothing granted is needed.
 */
export const MyShiftPreferences = ({
	companyId,
	weekStartMonday,
	shownDay,
	weekEnded = false,
	className,
}: MyShiftPreferencesProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const [editing, setEditing] = useState<PreferenceDay>();
	const week = useMyPreferenceWeek(companyId, weekStartMonday);
	const replace = useReplaceMyPreferenceDay(companyId, weekStartMonday);
	const language = formattingLocale(i18n);

	if (week.status === "error")
		return (
			<p className="text-sm text-error-700" role="alert">
				{t(`${key}.failed`)}
			</p>
		);
	if (week.status !== "ready")
		return (
			<div aria-busy="true" className={className}>
				<span className="sr-only">{t(`${key}.loading`)}</span>
				<Skeleton className="h-36 w-full rounded-lg" />
			</div>
		);

	const { maxShiftsPerDay, days } = week.week;
	const closedDaysNote = closedDaysNoteKey(days, weekEnded);
	const labelOf = (day: PreferenceDay): string => formatDay(day.date, language);
	const cells = days.map((day) => ({
		day: weekdayOf(day.date),
		cell: (
			<PreferredShiftsCell
				editLabel={t(`${key}.editDay`, { day: labelOf(day) })}
				shifts={preferredShifts(day)}
				onEdit={
					day.editable
						? (): void => {
								replace.reset();
								setEditing(day);
							}
						: undefined
				}
			/>
		),
	}));
	return (
		<div className={className}>
			<p className="mb-4 text-sm text-neutral-800">{t(`${key}.subtitle`)}</p>
			{closedDaysNote && (
				<Callout className="mb-4">{t(closedDaysNote)}</Callout>
			)}
			<WeekGrid
				label={t(`${key}.tab`)}
				rows={[{ id: "mine", days: cells }]}
				shownDay={shownDay}
				weekStartMonday={weekStartMonday}
			/>
			{editing && (
				<ShiftPreferenceDialog
					day={editing}
					dayLabel={labelOf(editing)}
					maxShifts={maxShiftsPerDay}
					saving={replace.isPending}
					refusal={
						replace.error
							? shiftPreferenceRefusal(replace.error, maxShiftsPerDay, t)
									.message
							: undefined
					}
					onClose={() => {
						setEditing(undefined);
					}}
					onSave={(shiftIds) => {
						replace.mutate(
							{ date: editing.date, shiftIds },
							{
								onSuccess: () => {
									setEditing(undefined);
								},
							}
						);
					}}
				/>
			)}
		</div>
	);
};
