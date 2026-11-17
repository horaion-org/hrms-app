import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formatDay } from "@/common/formatDay";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Callout } from "@/components/ui/Callout";
import { DescriptionList } from "@/components/ui/DescriptionList";
import { Dialog } from "@/components/ui/Dialog";
import { Skeleton } from "@/components/ui/Skeleton";
import type { PreferenceDay } from "@/features/shiftPreferences/api";
import { preferredShifts } from "@/features/shiftPreferences/preferenceLimit";
import { PreferredShiftsCell } from "@/features/shiftPreferences/PreferredShiftsCell";
import { ShiftPreferenceDialog } from "@/features/shiftPreferences/ShiftPreferenceDialog";
import { memberShiftPreferenceRefusal } from "@/features/shiftPreferences/shiftPreferenceRefusal";
import {
	useMemberPreferenceWeek,
	useReplaceMemberPreferenceDay,
} from "@/features/shiftPreferences/useShiftPreferences";

export type MemberShiftPreferencesDialogProps = {
	companyId: string;
	membershipId: string;
	/** The member's name, as their row of the team list shows it. */
	name: string;
	/** The shown week, as its Monday. */
	weekStartMonday: string;
	onClose: () => void;
};

const key = "shiftPreferences";

/** Why some of the week can't be changed: none of it, or only some days; none when every day is open. */
const closedDaysNoteKey = (
	days: ReadonlyArray<PreferenceDay>
):
	| "shiftPreferences.member.allClosed"
	| "shiftPreferences.outOfReach"
	| undefined => {
	if (days.every((day) => !day.editable))
		return "shiftPreferences.member.allClosed";
	if (days.some((day) => !day.editable)) return "shiftPreferences.outOfReach";
	return undefined;
};

/**
 * A colleague's preferred shifts for one week, opened from the team list: a
 * row per day, each open day a button that opens the day's editor in place of
 * the week. Saves straight away through the member's routes; a day before
 * today or more than eight weeks ahead is shown, never opened.
 */
export const MemberShiftPreferencesDialog = ({
	companyId,
	membershipId,
	name,
	weekStartMonday,
	onClose,
}: MemberShiftPreferencesDialogProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const [editing, setEditing] = useState<PreferenceDay>();
	const week = useMemberPreferenceWeek(
		companyId,
		membershipId,
		weekStartMonday
	);
	const replace = useReplaceMemberPreferenceDay(
		companyId,
		membershipId,
		weekStartMonday
	);
	const language = formattingLocale(i18n);
	const labelOf = (day: PreferenceDay): string => formatDay(day.date, language);

	/** The week's days once read, each open one a button to its editor; else why they are not shown. */
	const body = (): ReactNode => {
		if (week.status === "error")
			return (
				<p className="text-sm text-error-700" role="alert">
					{t(`${key}.member.failed`, { name })}
				</p>
			);
		if (week.status !== "ready")
			return (
				<div aria-busy="true">
					<span className="sr-only">{t(`${key}.loading`)}</span>
					<Skeleton className="h-64 w-full rounded-lg" />
				</div>
			);
		const { days } = week.week;
		const closedDaysNote = closedDaysNoteKey(days);
		return (
			<>
				{closedDaysNote && (
					<Callout className="mb-4">{t(closedDaysNote)}</Callout>
				)}
				<DescriptionList
					items={days.map((day) => ({
						label: labelOf(day),
						value: (
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
					}))}
				/>
			</>
		);
	};

	if (editing && week.status === "ready") {
		const { maxShiftsPerDay } = week.week;
		return (
			<ShiftPreferenceDialog
				day={editing}
				dayLabel={labelOf(editing)}
				maxShifts={maxShiftsPerDay}
				noShiftsNote={t(`${key}.member.noShifts`)}
				saving={replace.isPending}
				refusal={
					replace.error
						? memberShiftPreferenceRefusal(replace.error, maxShiftsPerDay, t)
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
		);
	}
	return (
		<Dialog
			open
			title={t(`${key}.member.title`)}
			description={t(`${key}.member.description`, {
				name,
				date: formatDay(weekStartMonday, language),
			})}
			onClose={onClose}
		>
			{body()}
		</Dialog>
	);
};
