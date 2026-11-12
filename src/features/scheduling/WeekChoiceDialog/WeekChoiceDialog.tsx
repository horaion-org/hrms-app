import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type { ConstraintTypeOption } from "@/features/scheduling/constraints/api";
import {
	WeekChoiceLists,
	type WeekChoiceConstraintRow,
	type WeekChoiceShiftRow,
} from "@/features/scheduling/WeekChoiceDialog/WeekChoiceLists";
import {
	weekChoiceProblem,
	type WeekChoiceIds,
} from "@/features/scheduling/weekChoice";

export type { WeekChoiceConstraintRow, WeekChoiceShiftRow };

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
 * unticks what this week leaves out; the department keeps it. The lists and
 * their rules are WeekChoiceLists. "Use for week" waits for at
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
	const problem = readOnly
		? undefined
		: weekChoiceProblem(working, constraints);

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
			<WeekChoiceLists
				constraintTypes={constraintTypes}
				constraints={constraints}
				readOnly={readOnly}
				shifts={shifts}
				value={working}
				onChange={setWorking}
			/>
			{problem && (
				<p className="mt-6 text-sm text-error-700" role="alert">
					{t(problem === "noShift" ? `${key}.noShift` : `${key}.noStaffing`)}
				</p>
			)}
		</Dialog>
	);
};
