import type { TFunction } from "i18next";
import { Button } from "@/components/ui/Button";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { DeleteIcon, EditIcon } from "@/components/ui/Icon";
import type { DepartmentConstraint } from "@/features/scheduling/constraints/api";
import { constraintColumns } from "@/features/scheduling/constraints/constraintColumns";
import { ConstraintOrigin } from "@/features/scheduling/constraints/ConstraintOrigin";

const key = "settings.scheduling.policy";
const constraints = "scheduling.constraints";

export type SchedulingPolicyColumnsOptions = {
	/** Whether the reader may change the policy (`scheduling_policy:update`); without it there are no actions. */
	canUpdate: boolean;
	onEdit: (constraint: DepartmentConstraint) => void;
	onRemove: (constraint: DepartmentConstraint) => void;
};

/**
 * The Scheduling policy's columns: the constraint's name and how it reads,
 * as a department's list shows them, its lock, its status, and, for someone
 * who may change the policy, Edit and Delete.
 */
export const schedulingPolicyColumns = (
	t: TFunction,
	{ canUpdate, onEdit, onRemove }: SchedulingPolicyColumnsOptions
): Array<DataTableColumn<DepartmentConstraint>> => {
	const shared = constraintColumns<DepartmentConstraint>(t);
	return [
		shared.name,
		shared.statement,
		{
			id: "lock",
			header: t(`${key}.lock`),
			headerClassName: "w-32",
			cell: (constraint) => (
				<ConstraintOrigin constraint={constraint} showLevel={false} />
			),
		},
		shared.status,
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
							</div>
						),
					},
				]
			: []),
	];
};
