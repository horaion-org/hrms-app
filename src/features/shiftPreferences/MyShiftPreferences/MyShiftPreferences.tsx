import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { weekdayOf } from "@/common/weekdays";
import { Skeleton } from "@/components/ui/Skeleton";
import { WeekGrid } from "@/components/ui/WeekGrid";
import type { PreferenceDay } from "@/features/shiftPreferences/api";
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
	className?: string;
};

const key = "shiftPreferences";

/** The names of a day's chosen shifts. */
const preferredNames = (day: PreferenceDay): Array<string> =>
	day.shifts.filter((shift) => shift.preferred).map((shift) => shift.name);

/**
 * The caller's own week as one row of seven days, each day's preferred shifts
 * as chips; an open day is one button that opens its dialog. Saves straight
 * away through their own routes: nothing granted is needed.
 */
export const MyShiftPreferences = ({
	companyId,
	weekStartMonday,
	shownDay,
	className,
}: MyShiftPreferencesProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const [editing, setEditing] = useState<PreferenceDay>();
	const week = useMyPreferenceWeek(companyId, weekStartMonday);
	const replace = useReplaceMyPreferenceDay(companyId, weekStartMonday);
	const dayLabel = new Intl.DateTimeFormat(formattingLocale(i18n), {
		weekday: "short",
		day: "numeric",
		month: "short",
	});

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
	const labelOf = (day: PreferenceDay): string =>
		dayLabel.format(new Date(`${day.date}T00:00:00`));
	const cells = days.map((day) => ({
		day: weekdayOf(day.date),
		cell: (
			<PreferredShiftsCell
				editLabel={t(`${key}.editDay`, { day: labelOf(day) })}
				names={preferredNames(day)}
				onEdit={
					day.editable
						? () => {
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
							? shiftPreferenceRefusal(replace.error, maxShiftsPerDay, t).message
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
