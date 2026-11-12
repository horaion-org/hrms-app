import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
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
	weekChoiceProblem,
	withShiftsChosen,
	type ChoiceConstraint,
	type ConstraintChoiceNote,
	type WeekChoiceIds,
} from "@/features/scheduling/weekChoice";

/** A shift as the dialog lists it. */
export type WeekChoiceShiftRow = ShiftTableRow;

/** A constraint as the dialog lists and chooses it. */
export type WeekChoiceConstraintRow = ConstraintTableRow & ChoiceConstraint;

export type WeekChoiceDialogProps = {
	/** The week, as the wizard names it, e.g. "Nov 16 – 22, 2026". */
	periodLabel: string;
	/** The department whose setup the week uses; it keeps whatever the week leaves out. */
	departmentName: string;
	shifts: Array<WeekChoiceShiftRow>;
	constraints: Array<WeekChoiceConstraintRow>;
	/** The constraint types, so a rule's sentence says who it covers; none reads as everyone. */
	constraintTypes?: ReadonlyArray<ConstraintTypeOption>;
	/** What the week uses now. */
	value: WeekChoiceIds;
	/** A generated schedule: shown as it was generated, nothing to tick. */
	readOnly?: boolean;
	/** Called with the new choice; the caller closes the dialog. */
	onApply: (choice: WeekChoiceIds) => void;
	onClose: () => void;
};

/**
 * What one week uses of its department's shifts and constraints. The manager
 * unticks what this week leaves out; the department keeps it. Leaving out a
 * shift switches off every constraint that names it, with the shifts named
 * under it; a locked constraint always applies. "Use for week" waits for at
 * least one shift and one staffing constraint. Knows nothing about other
 * weeks: one choice in, one out.
 */
export const WeekChoiceDialog = ({
	periodLabel,
	departmentName,
	shifts,
	constraints,
	constraintTypes,
	value,
	readOnly = false,
	onApply,
	onClose,
}: WeekChoiceDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const key = "scheduling.week";
	const [working, setWorking] = useState(value);
	const listed = listedConstraints(constraints);
	const listedShiftIds = shifts.map((shift) => shift.shiftId);
	const locked = listed
		.filter((constraint) => constraint.locked)
		.map((constraint) => constraint.constraintId);
	const problem = readOnly
		? undefined
		: weekChoiceProblem(working, constraints);
	const noteText = (
		note: ConstraintChoiceNote | undefined
	): string | undefined => {
		if (note === undefined) return undefined;
		if (note.kind === "locked") return t(`${key}.locked`);
		if (note.kind === "shiftGone") return t(`${key}.shiftGone`);
		return t(`${key}.leavesOut`, { shifts: note.shiftNames });
	};

	return (
		<Dialog
			open
			className="md:max-w-288"
			// Nothing can be unticked once generated, so only a choice is introduced.
			description={
				readOnly ? undefined : t(`${key}.intro`, { department: departmentName })
			}
			footer={
				readOnly ? (
					<Button className="w-full" variant="secondary" onClick={onClose}>
						{t(`${key}.close`)}
					</Button>
				) : (
					<div className="grid gap-6 sm:grid-cols-2">
						<Button variant="secondary" onClick={onClose}>
							{t(`${key}.cancel`)}
						</Button>
						<Button
							disabled={problem !== undefined}
							onClick={() => {
								onApply(working);
							}}
						>
							{t(`${key}.apply`)}
						</Button>
					</div>
				)
			}
			title={t(readOnly ? `${key}.titleGenerated` : `${key}.title`, {
				period: periodLabel,
			})}
			onClose={onClose}
		>
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
								selectedIds: working.shiftIds,
								onChange: (shiftIds): void => {
									setWorking(withShiftsChosen(working, shiftIds, constraints));
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
					noteText(noteOf(constraint, working.shiftIds, listedShiftIds))
				}
				selection={
					readOnly
						? undefined
						: {
								rowLabel: (constraint) => constraint.name,
								selectedIds: working.constraintIds,
								canSelect: (constraint) =>
									isSelectable(constraint, working.shiftIds),
								onChange: (constraintIds): void => {
									// Locked constraints are always used, whatever the table reports.
									setWorking({
										...working,
										constraintIds: [
											...new Set([
												...locked,
												...constraintIds.filter((constraintId) =>
													listed.some(
														(constraint) =>
															constraint.constraintId === constraintId &&
															isSelectable(constraint, working.shiftIds)
													)
												),
											]),
										],
									});
								},
							}
				}
			/>
			{problem && (
				<p className="mt-6 text-sm text-error-700" role="alert">
					{t(problem === "noShift" ? `${key}.noShift` : `${key}.noStaffing`)}
				</p>
			)}
		</Dialog>
	);
};
