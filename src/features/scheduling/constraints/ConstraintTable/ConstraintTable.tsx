import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import {
	DataTable,
	type DataTableColumn,
	type DataTableProps,
} from "@/components/ui/DataTable";
import { DeleteIcon, EditIcon } from "@/components/ui/Icon";
import { branchColumn } from "@/features/organisation/listColumns";
import { constraintColumns } from "@/features/scheduling/constraints/constraintColumns";
import { ConstraintOrigin } from "@/features/scheduling/constraints/ConstraintOrigin";
import { ConstraintTypeTag } from "@/features/scheduling/constraints/ConstraintTypeTag";
import type { Constraint } from "@/features/scheduling/scheduleDraft";

/** What the table reads of a constraint; a list across departments also names its Branch and Department. */
export type ConstraintTableRow = Pick<
	Constraint,
	| "constraintId"
	| "name"
	| "type"
	| "category"
	| "requirement"
	| "values"
	| "status"
	| "level"
	| "lock"
	| "locked"
	| "overridesConstraintId"
	| "replacementStatus"
	| "replacesCompanyConstraint"
> & {
	/** Null on a company constraint, which belongs to no Department. */
	branchName?: string | null;
	departmentName?: string | null;
};

export type ConstraintTableProps<Row extends ConstraintTableRow> = {
	/** The rows to show, already narrowed by the caller. */
	constraints: Array<Row>;
	/** Offers a box per constraint to tick it; without it the list is read-only. */
	selection?: DataTableProps<Row>["selection"];
	/** The rows are the frozen copies a schedule was generated with, so they have no status. */
	frozen?: boolean;
	/** Offered on each Department constraint the person may change. */
	onEdit?: (constraint: Row) => void;
	onDelete?: (constraint: Row) => void;
	/** Offered on each company constraint: make it stricter (or change a default) for the Department (ADR-0058). */
	onReplace?: (constraint: Row) => void;
	/** Whether the person may edit or delete this row; every row when left out. */
	canChange?: (constraint: Row) => boolean;
	/** No Branch is chosen, so each row names its own. */
	showBranch?: boolean;
	/** No Department is chosen, so each row names its own, and a company row reads "All departments". */
	showDepartment?: boolean;
	/** Shown across the table when there are no rows; "no constraints yet" when left out. */
	emptyState?: ReactNode;
	className?: string;
};

/**
 * Constraints as a table: each reads as its type's sentence, with who set it
 * and its requirement. The wizard's constraint step and the Constraints tab
 * both list constraints with it. Phones keep the name and the actions;
 * every other value reads on the name's line, as on Job titles.
 */
export const ConstraintTable = <Row extends ConstraintTableRow>({
	constraints,
	selection,
	frozen = false,
	onEdit,
	onDelete,
	onReplace,
	canChange,
	showBranch = false,
	showDepartment = false,
	emptyState,
	className,
}: ConstraintTableProps<Row>): FunctionComponent => {
	const { t } = useTranslation();
	const key = "scheduling.constraints";
	const columns = useMemo((): Array<DataTableColumn<Row>> => {
		const shared = constraintColumns<Row>(t);
		const requirementOf = (constraint: Row): string =>
			constraint.requirement
				? t(`${key}.requirements.${constraint.requirement}`)
				: t(`${key}.fixedRequirements.${constraint.type}`);
		const changeable = (constraint: Row): boolean =>
			constraint.level !== "COMPANY" && (canChange?.(constraint) ?? true);
		return [
			shared.name,
			...(showBranch ? [branchColumn<Row>(t)] : []),
			...(showDepartment
				? [
						{
							id: "department",
							header: t(`${key}.department`),
							cell: (constraint: Row): string =>
								constraint.departmentName ?? t(`${key}.allDepartments`),
							hideBelow: "md",
						} satisfies DataTableColumn<Row>,
					]
				: []),
			{
				...shared.type,
				// On the name's line the category and the type sit side by side.
				summary: (constraint) => (
					<span className="inline-flex items-center gap-1.5">
						<ConstraintTypeTag category={constraint.category} />
						{t(`${key}.types.${constraint.type}`)}
					</span>
				),
				hideBelow: "md",
			},
			{
				...shared.details,
				// One span, so the sentence wraps as text on the name's line rather than as separate pieces.
				summary: (constraint) => <span>{shared.details.cell(constraint)}</span>,
				hideBelow: "md",
			},
			{
				id: "setBy",
				header: t(`${key}.setBy`),
				headerClassName: "w-44",
				cell: (constraint) => <ConstraintOrigin constraint={constraint} />,
				hideBelow: "md",
			},
			{
				id: "requirement",
				header: t(`${key}.requirement`),
				headerClassName: "w-36",
				cell: requirementOf,
				sortValue: requirementOf,
				hideBelow: "md",
			},
			...(frozen ? [] : [{ ...shared.status, hideBelow: "md" as const }]),
			...(onEdit || onDelete || onReplace
				? [
						{
							id: "actions",
							header: t(`${key}.actions`),
							headerClassName: "w-30",
							pin: "end" as const,
							cell: (constraint: Row) => (
								<div className="flex justify-center gap-2">
									{onReplace && constraint.level === "COMPANY" && (
										<Button
											variant="icon"
											aria-label={t(
												constraint.locked
													? `${key}.makeStricter`
													: `${key}.changeHere`,
												{ name: constraint.name }
											)}
											onClick={() => {
												onReplace(constraint);
											}}
										>
											<EditIcon />
										</Button>
									)}
									{onEdit && changeable(constraint) && (
										<Button
											aria-label={t(`${key}.edit`, { name: constraint.name })}
											variant="icon"
											onClick={() => {
												onEdit(constraint);
											}}
										>
											<EditIcon />
										</Button>
									)}
									{onDelete && changeable(constraint) && (
										<Button
											aria-label={t(`${key}.delete`, { name: constraint.name })}
											className="text-error-700"
											variant="icon"
											onClick={() => {
												onDelete(constraint);
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
	}, [
		t,
		frozen,
		onEdit,
		onDelete,
		onReplace,
		canChange,
		showBranch,
		showDepartment,
	]);

	return (
		<DataTable
			className={className}
			columns={columns}
			data={constraints}
			emptyState={emptyState ?? t(`${key}.empty`)}
			getRowId={(constraint) => constraint.constraintId}
			label={t(`${key}.label`)}
			selection={selection}
		/>
	);
};
