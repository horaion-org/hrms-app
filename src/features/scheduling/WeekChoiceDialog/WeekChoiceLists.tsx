import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import type { ConstraintTypeOption } from "@/features/scheduling/constraints/api";
import {
	ConstraintTable,
	type ConstraintTableRow,
} from "@/features/scheduling/constraints/ConstraintTable";
import {
	ShiftTable,
	type ShiftTableRow,
} from "@/features/scheduling/shifts/ShiftTable";
import {
	isSelectable,
	listedConstraints,
	noteOf,
	withShiftsChosen,
	type ChoiceConstraint,
	type ConstraintChoiceNote,
	type WeekChoiceIds,
} from "@/features/scheduling/weekChoice";

/** A shift as a week's choice lists it. */
export type WeekChoiceShiftRow = ShiftTableRow;

/** A constraint as a week's choice lists and chooses it. */
export type WeekChoiceConstraintRow = ConstraintTableRow & ChoiceConstraint;

export type WeekChoiceListsProps = {
	shifts: Array<WeekChoiceShiftRow>;
	constraints: Array<WeekChoiceConstraintRow>;
	/** The constraint types, so a rule's sentence says who it covers; none reads as everyone. */
	constraintTypes?: ReadonlyArray<ConstraintTypeOption>;
	/** What the week uses now; the caller holds it. */
	value: WeekChoiceIds;
	/** A generated schedule: shown as it was generated, nothing to tick. */
	readOnly?: boolean;
	/** Called with the week's new choice. */
	onChange: (choice: WeekChoiceIds) => void;
};

/**
 * One week's shift and constraint tables. Leaving out a shift switches off
 * every constraint that names it, with the shifts named under it; a locked
 * constraint always applies. The choice is the caller's: this shows it and
 * reports each change.
 */
export const WeekChoiceLists = ({
	shifts,
	constraints,
	constraintTypes,
	value,
	readOnly = false,
	onChange,
}: WeekChoiceListsProps): FunctionComponent => {
	const { t } = useTranslation();
	const key = "scheduling.week";
	const listed = listedConstraints(constraints);
	const listedShiftIds = shifts.map((shift) => shift.shiftId);
	const locked = listed
		.filter((constraint) => constraint.locked)
		.map((constraint) => constraint.constraintId);
	const noteText = (
		note: ConstraintChoiceNote | undefined
	): string | undefined => {
		if (note === undefined) return undefined;
		if (note.kind === "locked") return t(`${key}.locked`);
		if (note.kind === "shiftGone") return t(`${key}.shiftGone`);
		return t(`${key}.leavesOut`, { shifts: note.shiftNames });
	};

	return (
		<>
			<h3 className="text-sm font-semibold text-neutral-900">
				{t(`${key}.shifts`)}
			</h3>
			<ShiftTable
				className="mt-4"
				shifts={shifts}
				selection={
					readOnly
						? undefined
						: {
								selectedIds: value.shiftIds,
								onChange: (shiftIds): void => {
									onChange(withShiftsChosen(value, shiftIds, constraints));
								},
							}
				}
			/>
			<h3 className="mt-8 text-sm font-semibold text-neutral-900">
				{t(`${key}.constraints`)}
			</h3>
			<ConstraintTable
				className="mt-4"
				constraints={listed}
				frozen={readOnly}
				types={constraintTypes}
				noteOf={(constraint) =>
					noteText(noteOf(constraint, value.shiftIds, listedShiftIds))
				}
				selection={
					readOnly
						? undefined
						: {
								rowLabel: (constraint) => constraint.name,
								selectedIds: value.constraintIds,
								canSelect: (constraint) =>
									isSelectable(constraint, value.shiftIds),
								onChange: (constraintIds): void => {
									// Locked constraints are always used, whatever the table reports.
									onChange({
										...value,
										constraintIds: [
											...new Set([
												...locked,
												...constraintIds.filter((constraintId) =>
													listed.some(
														(constraint) =>
															constraint.constraintId === constraintId &&
															isSelectable(constraint, value.shiftIds)
													)
												),
											]),
										],
									});
								},
							}
				}
			/>
		</>
	);
};
