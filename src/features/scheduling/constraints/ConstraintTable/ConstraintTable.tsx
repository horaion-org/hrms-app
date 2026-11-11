import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import {
	DataTable,
	type ColumnBreakpoint,
	type DataTableColumn,
	type DataTableProps,
} from "@/components/ui/DataTable";
import { DeleteIcon, EditIcon } from "@/components/ui/Icon";
import { branchColumn } from "@/features/organisation/listColumns";
import { constraintColumns } from "@/features/scheduling/constraints/constraintColumns";
import { ConstraintOrigin } from "@/features/scheduling/constraints/ConstraintOrigin";
import type {
	ReachedBranch,
	ReachedDepartment,
} from "@/features/scheduling/constraints/api";
import { reachLabel } from "@/features/scheduling/policy/policyReach";
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
	/** Where a work-policy constraint applies; a frozen copy has none and reads as every Department. */
	appliesToBranches?: Array<ReachedBranch>;
	appliesToDepartments?: Array<ReachedDepartment>;
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
	/** Whether this Department constraint offers Edit; every one when left out. */
	canEdit?: (constraint: Row) => boolean;
	/** Whether this Department constraint offers Delete; every one when left out. */
	canDelete?: (constraint: Row) => boolean;
	/** No Branch is chosen, so each row names its own. */
	showBranch?: boolean;
	/** No Department is chosen, so each row names its own, and a work-policy row reads where it applies. */
	showDepartment?: boolean;
	/** Puts Set by and Status on the name's line below 2xl, for the setup tab. */
	metaOnNameLine?: boolean;
	/** A short note under a constraint's name, e.g. why it can't be chosen; none when it returns undefined. */
	noteOf?: (constraint: Row) => string | undefined;
	/** Shown across the table when there are no rows; "no constraints yet" when left out. */
	emptyState?: ReactNode;
	className?: string;
};

/**
 * Constraints as a table: each reads as its firmness tag, its sentence and
 * who it applies to, with who set it. The wizard's constraint step and the
 * Constraints tab both list constraints with it. Phones keep the name and the
 * actions; every other value reads on the name's line, as on Job titles.
 * On the setup tab, Set by and Status stay on that line up to 2xl, so the
 * sentence keeps room on a desktop screen.
 */
export const ConstraintTable = <Row extends ConstraintTableRow>({
	constraints,
	selection,
	frozen = false,
	onEdit,
	onDelete,
	onReplace,
	canEdit,
	canDelete,
	showBranch = false,
	showDepartment = false,
	metaOnNameLine = false,
	noteOf,
	emptyState,
	className,
}: ConstraintTableProps<Row>): FunctionComponent => {
	const { t } = useTranslation();
	const key = "scheduling.constraints";
	const columns = useMemo((): Array<DataTableColumn<Row>> => {
		const shared = constraintColumns<Row>(t);
		// A company constraint is changed only by replacing it here, never edited or deleted.
		const editable = (constraint: Row): boolean =>
			constraint.level !== "COMPANY" && (canEdit?.(constraint) ?? true);
		const deletable = (constraint: Row): boolean =>
			constraint.level !== "COMPANY" && (canDelete?.(constraint) ?? true);
		// The setup tab keeps who set it and its status on the name's line until
		// 2xl; the wizard leaves them as columns from md.
		const settingsHideBelow: ColumnBreakpoint = metaOnNameLine ? "2xl" : "md";
		return [
			{
				...shared.name,
				cell: (constraint: Row): ReactNode => {
					const note = noteOf?.(constraint);
					if (!note) return constraint.name;
					return (
						<>
							<span className="block">{constraint.name}</span>
							<span className="mt-1 block font-normal text-neutral-800">
								{note}
							</span>
						</>
					);
				},
			},
			...(showBranch ? [branchColumn<Row>(t)] : []),
			...(showDepartment
				? [
						{
							id: "department",
							header: t(`${key}.department`),
							cell: (constraint: Row): string =>
								constraint.level === "COMPANY"
									? reachLabel(
											{
												appliesToBranches: constraint.appliesToBranches ?? [],
												appliesToDepartments:
													constraint.appliesToDepartments ?? [],
											},
											t
										)
									: (constraint.departmentName ?? t(`${key}.allDepartments`)),
							hideBelow: "md",
						} satisfies DataTableColumn<Row>,
					]
				: []),
			{
				...shared.statement,
				// On a phone the constraint reads in full on the name's line.
				summary: (constraint) => shared.statement.cell(constraint),
				hideBelow: "md",
			},
			{
				id: "setBy",
				header: t(`${key}.setBy`),
				headerClassName: "w-44",
				cell: (constraint) => <ConstraintOrigin constraint={constraint} />,
				hideBelow: settingsHideBelow,
			},
			...(frozen ? [] : [{ ...shared.status, hideBelow: settingsHideBelow }]),
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
									{onEdit && editable(constraint) && (
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
									{onDelete && deletable(constraint) && (
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
		canEdit,
		canDelete,
		showBranch,
		showDepartment,
		metaOnNameLine,
		noteOf,
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
