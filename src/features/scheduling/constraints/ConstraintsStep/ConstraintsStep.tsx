import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { PlusIcon } from "@/components/ui/Icon";
import { ConstraintTable } from "@/features/scheduling/constraints/ConstraintTable";
import {
	isTickable,
	tickedConstraintsOf,
	type Constraint,
	type ListProblem,
} from "@/features/scheduling/scheduleDraft";
import { StepPanel } from "@/features/scheduling/StepPanel";

export type ConstraintsStepProps = {
	constraints: Array<Constraint>;
	/** The constraints this schedule applies. */
	includedConstraintIds: Array<string>;
	/** Offers a box per constraint to tick it; without it the list is read-only, as a generated schedule's is. */
	onIncludedChange?: (constraintIds: Array<string>) => void;
	/** The schedule was generated: the constraints are the copies it was generated with. */
	frozen?: boolean;
	/** Offered only when the person may add constraints to the department. */
	onAdd?: () => void;
	/** Offered on each row only when the person may change constraints here. */
	onEdit?: (constraint: Constraint) => void;
	onDelete?: (constraint: Constraint) => void;
	/**
	 * Offered on a company constraint the department has not replaced yet, when
	 * the person may add constraints here: make it stricter (or change a
	 * default) for this department (ADR-0058).
	 */
	onReplace?: (constraint: Constraint) => void;
	/** Why the list is not available, e.g. not permitted or failed to load. */
	listProblem?: ListProblem;
	className?: string;
};

/** A company constraint the department replaced is shown through its replacement, not twice. */
const isShown = (constraint: Constraint): boolean =>
	!constraint.overriddenByConstraintId;

/**
 * The department's constraints, ticking the ones this schedule applies, with
 * adding, editing and deleting for those allowed; once the schedule is
 * generated, the frozen copies it was generated with. Each constraint reads as
 * its type's sentence. An inactive constraint is listed but never ticked: the
 * API refuses it. The company's Scheduling policy comes first (ADR-0058): a
 * locked constraint is always ticked and cannot be unticked, a company
 * constraint is changed only by replacing it for the department, and one the
 * department replaced shows as its replacement ("Stricter here").
 */
export const ConstraintsStep = ({
	constraints,
	includedConstraintIds,
	onIncludedChange,
	frozen = false,
	onAdd,
	onEdit,
	onDelete,
	onReplace,
	listProblem,
	className,
}: ConstraintsStepProps): FunctionComponent => {
	const { t } = useTranslation();
	const key = "scheduling.constraints";
	const shown = constraints.filter(isShown);
	const locked = shown
		.filter((constraint) => constraint.locked && isTickable(constraint))
		.map((constraint) => constraint.constraintId);
	const tickable = shown
		.filter((constraint) => isTickable(constraint) && !constraint.locked)
		.map((constraint) => constraint.constraintId);
	// The same rule the API applies: locked ones, and a replaced company tick as its replacement.
	const ticked = tickedConstraintsOf({ includedConstraintIds }, constraints);

	return (
		<StepPanel
			className={className}
			title={t(`${key}.title`)}
			actions={
				onAdd && (
					<Button leadingIcon={<PlusIcon />} size="sm" onClick={onAdd}>
						{t(`${key}.add`)}
					</Button>
				)
			}
			description={t(
				frozen ? `${key}.frozenDescription` : `${key}.description`
			)}
		>
			{listProblem ? (
				<p
					className="mt-10 text-sm text-neutral-700 data-alert:text-error-700"
					data-alert={listProblem.alert || undefined}
					role={listProblem.alert ? "alert" : undefined}
				>
					{listProblem.message}
				</p>
			) : (
				<ConstraintTable
					className="mt-10"
					constraints={shown}
					frozen={frozen}
					selection={
						onIncludedChange && {
							rowLabel: (constraint) => constraint.name,
							selectedIds: ticked,
							canSelect: (constraint) =>
								tickable.includes(constraint.constraintId),
							onChange: (constraintIds): void => {
								// Locked constraints are always sent, whatever the table reports.
								onIncludedChange([
									...locked,
									...constraintIds.filter((constraintId) =>
										tickable.includes(constraintId)
									),
								]);
							},
						}
					}
					onDelete={onDelete}
					onEdit={onEdit}
					onReplace={onReplace}
				/>
			)}
		</StepPanel>
	);
};
