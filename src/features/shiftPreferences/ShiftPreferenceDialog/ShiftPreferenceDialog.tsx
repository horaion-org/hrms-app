import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dialog } from "@/components/ui/Dialog";
import { ErrorText } from "@/components/ui/ErrorText";
import type { PreferenceDay } from "@/features/shiftPreferences/api";
import {
	chosenShiftIds,
	isAtLimit,
	toggledShiftIds,
} from "@/features/shiftPreferences/preferenceLimit";

export type ShiftPreferenceDialogProps = {
	/** The day being chosen for, with its choosable shifts. */
	day: PreferenceDay;
	/** The day as a heading reads it, e.g. "Mon 24 Nov". */
	dayLabel: string;
	/** The most shifts the day may hold. */
	maxShifts: number;
	/** Saving: the refusal said, if any. */
	saving: boolean;
	refusal?: string;
	/** What the day says when no shift needs the job title, worded for whose day it is. */
	noShiftsNote: string;
	/** Warns that the person has no availability that day; choosing stays possible. */
	unavailableNote?: string;
	onSave: (shiftIds: Array<string>) => void;
	onClose: () => void;
};

const key = "shiftPreferences";

/** A day's shifts as boxes, at most `maxShifts` ticked, with the count, Save and Clear, under a warning when given. */
export const ShiftPreferenceDialog = ({
	day,
	dayLabel,
	maxShifts,
	saving,
	refusal,
	noShiftsNote,
	unavailableNote,
	onSave,
	onClose,
}: ShiftPreferenceDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const [chosen, setChosen] = useState(() => chosenShiftIds(day));
	const full = isAtLimit(chosen.length, maxShifts);
	return (
		<Dialog
			open
			preventClose={saving}
			title={t(`${key}.editDay`, { day: dayLabel })}
			footer={
				<>
					<Button
						disabled={saving}
						variant="cancel"
						onClick={() => {
							onSave([]);
						}}
					>
						{t(`${key}.dialog.clear`)}
					</Button>
					<Button
						loading={saving}
						onClick={() => {
							onSave(chosen);
						}}
					>
						{saving ? t(`${key}.dialog.saving`) : t(`${key}.dialog.save`)}
					</Button>
				</>
			}
			onClose={onClose}
		>
			{unavailableNote && (
				<Callout className="mb-4" tone="warning">
					{unavailableNote}
				</Callout>
			)}
			{day.shifts.length === 0 ? (
				<p className="text-sm text-neutral-800">{noShiftsNote}</p>
			) : (
				<div className="flex flex-col gap-3">
					{day.shifts.map((shift) => (
						<Checkbox
							key={shift.shiftId}
							checked={chosen.includes(shift.shiftId)}
							disabled={!chosen.includes(shift.shiftId) && full}
							label={shift.name}
							description={t("scheduling.timeRange", {
								start: shift.startTime,
								end: shift.endTime,
							})}
							onChange={() => {
								setChosen(toggledShiftIds(chosen, shift.shiftId, maxShifts));
							}}
						/>
					))}
					<p className="text-xs text-neutral-800">
						{t(`${key}.count`, { chosen: chosen.length, max: maxShifts })}
					</p>
				</div>
			)}
			{refusal && <ErrorText>{refusal}</ErrorText>}
		</Dialog>
	);
};
