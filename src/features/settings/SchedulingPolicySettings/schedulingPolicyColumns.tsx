import type { TFunction } from "i18next";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { DeleteIcon, EditIcon } from "@/components/ui/Icon";
import type {
	ConstraintTypeOption,
	DepartmentConstraint,
} from "@/features/scheduling/constraints/api";
import { constraintColumns } from "@/features/scheduling/constraints/constraintColumns";
import { ConstraintOrigin } from "@/features/scheduling/constraints/ConstraintOrigin";

const key = "settings.scheduling.policy";
const constraints = "scheduling.constraints";

export type SchedulingPolicyColumnsOptions = {
	/** Whether the reader may change the policy (`scheduling_policy:update`); without it there are no actions. */
	canUpdate: boolean;
	/** The constraint types (`constraint-options`): who each covers, and which the system adds; empty until read. */
	types: ReadonlyArray<ConstraintTypeOption>;
	onEdit: (constraint: DepartmentConstraint) => void;
	onRemove: (constraint: DepartmentConstraint) => void;
};

/**
 * The work policy's columns: the constraint's name and how it reads (where it
 * applies on its last line), as a department's list shows them, its lock, its
 * status, and, for someone who may change the policy, Edit and Delete. A rule
 * the system adds always applies: "Always applies" in place of its lock, and
 * no Delete. A phone
 * keeps the name and the actions as columns and puts the rest on the name's
 * line, as the Constraints tab does.
 */
export const schedulingPolicyColumns = (
	t: TFunction,
	{ canUpdate, types, onEdit, onRemove }: SchedulingPolicyColumnsOptions
): Array<DataTableColumn<DepartmentConstraint>> => {
	const shared = constraintColumns<DepartmentConstraint>(t, types);
	const alwaysApplies = (constraint: DepartmentConstraint): boolean =>
		types.some(
			(option) => option.type === constraint.type && option.addedBySystem
		);
	return [
		shared.name,
		{
			...shared.statement,
			// On a phone the constraint reads in full on the name's line, as on the Constraints tab.
			summary: (constraint) => shared.statement.cell(constraint),
			hideBelow: "md",
		},
		{
			id: "lock",
			header: t(`${key}.lock`),
			headerClassName: "w-32",
			cell: (constraint) =>
				alwaysApplies(constraint) ? (
					<Badge compact tone="neutral">
						{t("scheduling.policy.alwaysApplies")}
					</Badge>
				) : (
					<ConstraintOrigin constraint={constraint} showLevel={false} />
				),
			// The settings pane is narrow: below 2xl the lock and status read on the name's line, so the constraint has room.
			hideBelow: "2xl",
		},
		{ ...shared.status, hideBelow: "2xl" },
		...(canUpdate
			? [
					{
						id: "actions",
						header: t(`${constraints}.actions`),
						headerClassName: "w-30",
						pin: "end" as const,
						cell: (constraint: DepartmentConstraint) => (
							<div className="flex justify-center gap-2">
								<Button
									variant="icon"
									aria-label={t(`${constraints}.edit`, {
										name: constraint.name,
									})}
									onClick={() => {
										onEdit(constraint);
									}}
								>
									<EditIcon />
								</Button>
								{!alwaysApplies(constraint) && (
									<Button
										className="text-error-700"
										variant="icon"
										aria-label={t(`${constraints}.delete`, {
											name: constraint.name,
										})}
										onClick={() => {
											onRemove(constraint);
										}}
									>
										<DeleteIcon />
									</Button>
								)}
							</div>
						),
					},
				]
			: []),
	];
};
