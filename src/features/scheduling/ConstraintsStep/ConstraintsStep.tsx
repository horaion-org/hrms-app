import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { DeleteIcon, EditIcon, PlusIcon } from "@/components/ui/Icon";
import { ConstraintTypeTag } from "@/features/scheduling/ConstraintTypeTag";
import { PriorityIndicator } from "@/features/scheduling/PriorityIndicator";
import {
	CONSTRAINT_STATUSES,
	PRIORITIES,
	type Constraint,
	type ConstraintStatus,
} from "@/features/scheduling/scheduleDraft";
import { StepPanel } from "@/features/scheduling/StepPanel";

export type ConstraintsStepProps = {
	constraints: Array<Constraint>;
	/** The constraints this schedule applies. */
	includedConstraintIds: Array<string>;
	onIncludedChange: (constraintIds: Array<string>) => void;
	onAdd: () => void;
	onDelete: (constraint: Constraint) => void;
	className?: string;
};

const statusTones: Record<ConstraintStatus, BadgeTone> = {
	ACTIVE: "success",
	DRAFT: "warning",
	DISABLED: "neutral",
};

/**
 * The rules the schedule must respect. Editing waits for the scheduling API,
 * so that action stays disabled.
 */
export const ConstraintsStep = ({
	constraints,
	includedConstraintIds,
	onIncludedChange,
	onAdd,
	onDelete,
	className,
}: ConstraintsStepProps): FunctionComponent => {
	const { t } = useTranslation();
	const columns = useMemo(
		(): Array<DataTableColumn<Constraint>> => [
			{
				id: "name",
				header: t("scheduling.constraints.name"),
				cell: (constraint) => constraint.name,
				cellClassName: "font-semibold",
			},
			{
				id: "type",
				header: t("scheduling.constraints.type"),
				cell: (constraint) => <ConstraintTypeTag type={constraint.type} />,
				sortValue: (constraint) =>
					t(`scheduling.constraints.types.${constraint.type}`),
			},
			{
				id: "details",
				header: t("scheduling.constraints.details"),
				headerClassName: "w-55",
				cell: (constraint) => constraint.details,
			},
			{
				id: "priority",
				header: t("scheduling.constraints.priority"),
				headerClassName: "w-34",
				cell: (constraint) => (
					<PriorityIndicator priority={constraint.priority} />
				),
				sortValue: (constraint) => PRIORITIES.indexOf(constraint.priority),
			},
			{
				id: "status",
				header: t("scheduling.constraints.status"),
				headerClassName: "w-32",
				cell: (constraint) => (
					<Badge tone={statusTones[constraint.status]}>
						{t(`scheduling.constraints.statuses.${constraint.status}`)}
					</Badge>
				),
				sortValue: (constraint) =>
					CONSTRAINT_STATUSES.indexOf(constraint.status),
			},
			{
				id: "actions",
				header: t("scheduling.constraints.actions"),
				headerClassName: "w-30",
				cell: (constraint) => (
					<div className="flex justify-center gap-2">
						<Button
							disabled
							variant="icon"
							aria-label={t("scheduling.constraints.edit", {
								name: constraint.name,
							})}
						>
							<EditIcon />
						</Button>
						<Button
							className="text-error-700"
							variant="icon"
							aria-label={t("scheduling.constraints.delete", {
								name: constraint.name,
							})}
							onClick={() => {
								onDelete(constraint);
							}}
						>
							<DeleteIcon />
						</Button>
					</div>
				),
			},
		],
		[t, onDelete]
	);

	return (
		<StepPanel
			className={className}
			description={t("scheduling.constraints.description")}
			title={t("scheduling.constraints.title")}
			actions={
				<Button leadingIcon={<PlusIcon />} size="sm" onClick={onAdd}>
					{t("scheduling.constraints.add")}
				</Button>
			}
		>
			<DataTable
				className="mt-10"
				columns={columns}
				data={constraints}
				emptyState={t("scheduling.constraints.empty")}
				getRowId={(constraint) => constraint.constraintId}
				label={t("scheduling.constraints.label")}
				selection={{
					rowLabel: (constraint) => constraint.name,
					selectedIds: includedConstraintIds,
					onChange: onIncludedChange,
				}}
			/>
		</StepPanel>
	);
};
