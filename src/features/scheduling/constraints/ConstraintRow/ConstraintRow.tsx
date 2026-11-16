import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AlertIcon, DeleteIcon, EditIcon } from "@/components/ui/Icon";
import { LockIcon } from "@/components/ui/LockIcon";
import type {
	ConstraintTypeOption,
	DepartmentConstraint,
} from "@/features/scheduling/constraints/api";
import { appliesToOf } from "@/features/scheduling/constraints/appliesTo";
import type { CapacityProblem } from "@/features/scheduling/constraints/capacityProblems";
import { ConstraintOrigin } from "@/features/scheduling/constraints/ConstraintOrigin";
import { ConstraintStatement } from "@/features/scheduling/constraints/ConstraintStatement";

export type ConstraintRowProps = {
	constraint: DepartmentConstraint;
	/** The constraint types (`constraint-options`), so the sentence says who it covers; none reads as everyone. */
	types: ReadonlyArray<ConstraintTypeOption>;
	/** It holds a value that no longer fits, or asks for more people than hold its job titles. */
	needsAttention: boolean;
	/** Why it can never be met, where the staffing read says so. */
	capacity?: CapacityProblem;
	/** No Department is chosen, so the row names its own. */
	showDepartment?: boolean;
	/** Where the attention banner's link brings the row into view. */
	id?: string;
	onEdit?: () => void;
	onDelete?: () => void;
	/** Makes a company constraint stricter, or changes a default, for the chosen Department. */
	onReplace?: () => void;
};

/**
 * One constraint in a ConstraintSection: what needs attention or is switched
 * off as tags, then the sentence it reads as (its Must or If possible tag,
 * who it applies to and any value that no longer fits), then its name and
 * where it comes from, and its actions. A row that needs attention offers Fix.
 */
export const ConstraintRow = ({
	constraint,
	types,
	needsAttention,
	capacity,
	showDepartment = false,
	id,
	onEdit,
	onDelete,
	onReplace,
}: ConstraintRowProps): FunctionComponent => {
	const { t } = useTranslation();
	const nameId = useId();
	const key = "scheduling.constraints";
	const type = types.find((option) => option.type === constraint.type);
	const inactive = constraint.status === "INACTIVE";
	// The company's own say how they bind; a department's replacement says it stands in.
	const lockWords =
		constraint.level === "COMPANY"
			? type?.addedBySystem
				? t(`${key}.row.locks.SYSTEM`)
				: constraint.lock === "LOCKED" || constraint.lock === "DEFAULT"
					? t(`${key}.row.locks.${constraint.lock}`)
					: undefined
			: undefined;
	return (
		<li
			aria-labelledby={nameId}
			id={id}
			tabIndex={id === undefined ? undefined : -1}
			className={
				needsAttention
					? "flex flex-col gap-4 bg-error-50 px-6 py-4 sm:flex-row sm:items-start"
					: "flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-start"
			}
		>
			<div className="min-w-0 flex-1">
				{(needsAttention || inactive) && (
					<p className="mb-2 flex flex-wrap gap-1">
						{needsAttention && (
							<Badge compact tone="error">
								{t(`${key}.problems.needsAttention`)}
							</Badge>
						)}
						{inactive && (
							<Badge compact tone="neutral">
								{t(`${key}.statuses.INACTIVE`)}
							</Badge>
						)}
					</p>
				)}
				<ConstraintStatement
					appliesTo={appliesToOf(constraint, t)}
					className="text-base"
					constraint={{
						...constraint,
						fullTimersOnly: type?.fullTimersOnly ?? false,
						requirementPolicy: type?.requirementPolicy,
					}}
				/>
				{capacity && (
					<p className="mt-2 flex items-start gap-2 text-xs text-error-700">
						<AlertIcon aria-hidden="true" className="size-4 shrink-0" />
						{t(`${key}.row.capacity`, {
							count: capacity.peopleWithTitles,
							titles: t(`${key}.list`, { items: capacity.jobTitleNames }),
							headcount: capacity.headcount,
						})}
					</p>
				)}
				<p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-700">
					<span id={nameId}>{constraint.name}</span>
					{showDepartment && constraint.departmentName && (
						<span>· {constraint.departmentName}</span>
					)}
					{lockWords && (
						<span className="inline-flex items-center gap-1">
							·{constraint.lock === "LOCKED" && <LockIcon className="size-4" />}
							{lockWords}
						</span>
					)}
					{constraint.overridesConstraintId && (
						<ConstraintOrigin constraint={constraint} showLevel={false} />
					)}
				</p>
			</div>
			<div className="flex shrink-0 items-center gap-2">
				{onReplace && (
					<Button
						variant="textlink"
						aria-label={t(
							constraint.locked ? `${key}.makeStricter` : `${key}.changeHere`,
							{ name: constraint.name }
						)}
						onClick={onReplace}
					>
						{t(
							constraint.locked
								? `${key}.row.makeStricter`
								: `${key}.row.changeHere`
						)}
					</Button>
				)}
				{onEdit &&
					(needsAttention ? (
						<Button
							aria-label={t(`${key}.row.fixLabel`, { name: constraint.name })}
							variant="textlink"
							onClick={onEdit}
						>
							{t(`${key}.row.fix`)}
						</Button>
					) : (
						<Button
							aria-label={t(`${key}.edit`, { name: constraint.name })}
							variant="icon"
							onClick={onEdit}
						>
							<EditIcon />
						</Button>
					))}
				{onDelete && (
					<Button
						aria-label={t(`${key}.delete`, { name: constraint.name })}
						className="text-error-700"
						variant="icon"
						onClick={onDelete}
					>
						<DeleteIcon />
					</Button>
				)}
			</div>
		</li>
	);
};
