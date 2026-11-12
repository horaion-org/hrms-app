import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { RadioCard } from "@/components/forms/RadioCard";
import { Select } from "@/components/forms/Select";
import { dayTypeLabel } from "@/features/scheduling/dayTypes";
import { formatTimeRange } from "@/features/scheduling/formatShift";
import {
	assignmentCell,
	rosterCellText,
} from "@/features/scheduling/rosterChanges/cellText";
import type { RosterPanelMode } from "@/features/scheduling/rosterChanges/rosterLeave";
import type { CellChoicesState } from "@/features/scheduling/RosterCellPanel/cellPanelState";

export type CellChoicesProps = {
	choices: CellChoicesState;
	/** Groups the mode radios; unique per panel. */
	radioName: string;
	/** Whose day, or "Former member". */
	name: string;
	/** The day, formatted for reading. */
	day: string;
	/** The day holds a shift, so the shift choice reads "Another shift". */
	dayHasShift: boolean;
};

const key = "scheduling.rosterEdit";

/**
 * "Change to": one radio per mode the day offers, then the pick the chosen
 * mode needs: a leave type, a shift (or why there is none), the type of a day
 * not worked (when the schedule offers types), or a person to swap with,
 * naming those who can't.
 */
export const CellChoices = ({
	choices,
	radioName,
	name,
	day,
	dayHasShift,
}: CellChoicesProps): FunctionComponent => {
	const { t } = useTranslation();
	const choicesId = useId();
	const { mode, partners } = choices;
	const modeLabels: Record<RosterPanelMode, string> = {
		shift: t(dayHasShift ? `${key}.anotherShift` : `${key}.aShift`),
		dayOff: t(`${key}.${choices.notWorkingWording}`),
		swap: t(`${key}.swap`),
		leave: t(`${key}.leave`),
		anotherType: t(`${key}.anotherLeaveType`),
	};

	return (
		<>
			<h3 className="text-sm font-medium text-neutral-800" id={choicesId}>
				{t(`${key}.changeTo`)}
			</h3>
			<div
				aria-labelledby={choicesId}
				className="flex flex-col gap-2"
				role="radiogroup"
			>
				{choices.modes.map((value) => (
					<RadioCard
						key={value}
						checked={mode === value}
						label={modeLabels[value]}
						name={radioName}
						value={value}
						onChange={() => {
							choices.chooseMode(value);
						}}
					/>
				))}
			</div>
			{(mode === "leave" || mode === "anotherType") && (
				<Select
					aria-label={t(`${key}.leaveType`)}
					options={choices.leaveOptions}
					placeholder={t(`${key}.chooseLeaveType`)}
					value={choices.leaveType}
					onChange={choices.setLeaveType}
				/>
			)}
			{mode === "shift" &&
				(choices.shiftChoices.length === 0 ? (
					<p className="text-sm text-neutral-800">
						{t(`${key}.noShift`, { weekday: day, name })}
					</p>
				) : (
					<Select
						aria-label={t(`${key}.shift`)}
						placeholder={t(`${key}.chooseShift`)}
						value={choices.shiftId}
						options={choices.shiftChoices.map((shift) => ({
							value: shift.shiftId,
							label: `${shift.name} · ${formatTimeRange(shift, t)}`,
						}))}
						onChange={choices.setShiftId}
					/>
				))}
			{mode === "dayOff" && choices.dayTypes.length > 0 && (
				<Select
					aria-label={t(`${key}.dayType`)}
					value={choices.dayType}
					options={choices.dayTypes.map((code) => ({
						value: code,
						label: dayTypeLabel(code, t),
					}))}
					onChange={choices.setDayType}
				/>
			)}
			{mode === "swap" && (
				<>
					<Select
						aria-label={t(`${key}.swapWith`)}
						placeholder={t(`${key}.choosePerson`)}
						value={choices.partnerId}
						options={partners.available.map((row) => ({
							value: row.assignmentId,
							label: `${row.member?.displayName ?? ""} · ${rosterCellText(
								assignmentCell(row),
								t
							)}`,
						}))}
						onChange={choices.setPartnerId}
					/>
					{partners.unavailable.length > 0 && (
						<p className="text-sm text-neutral-800">
							{t(`${key}.notAvailable`, {
								count: partners.unavailable.length,
								names: partners.unavailable
									.map(
										(row) =>
											row.member?.displayName ??
											t("scheduling.detail.formerMember")
									)
									.join(", "),
							})}
						</p>
					)}
				</>
			)}
		</>
	);
};
