import type { TFunction } from "i18next";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import type { DataTableColumn } from "@/components/ui/DataTable";
import {
	CONSTRAINT_STATUSES,
	type ConstraintStatus,
} from "@/features/scheduling/constraints/api";
import { appliesToOf } from "@/features/scheduling/constraints/appliesTo";
import { ConstraintStatement } from "@/features/scheduling/constraints/ConstraintStatement";
import type { Constraint } from "@/features/scheduling/scheduleDraft";

/*
 * The columns every list of constraints shares, so a schedule's Constraints
 * step and the company's Scheduling policy read the same and later list work
 * changes one place: the name, the constraint as it reads (its firmness tag,
 * its sentence and who it applies to) and the status. Each list adds its own
 * columns around them.
 */

/** A row of a constraints list: a schedule's constraint or a company constraint. */
type ConstraintRow = Pick<
	Constraint,
	"name" | "type" | "requirement" | "values" | "status" | "level"
> & {
	/** Names the department in the applies-to line; lists that leave it out show no line for department-wide types. */
	departmentName?: string | null;
};

export const statusTones: Record<ConstraintStatus, BadgeTone> = {
	ACTIVE: "success",
	INACTIVE: "neutral",
};

/** The shared columns, each placed by the list that uses it. */
export const constraintColumns = <Row extends ConstraintRow>(
	t: TFunction
): {
	name: DataTableColumn<Row>;
	statement: DataTableColumn<Row>;
	status: DataTableColumn<Row>;
} => {
	const key = "scheduling.constraints";
	return {
		name: {
			id: "name",
			header: t(`${key}.name`),
			cell: (constraint) => constraint.name,
			cellClassName: "font-semibold",
			pin: "start",
		},
		statement: {
			id: "statement",
			header: t(`${key}.statement`),
			cell: (constraint) => (
				<ConstraintStatement
					appliesTo={appliesToOf(constraint, t)}
					constraint={constraint}
				/>
			),
		},
		status: {
			id: "status",
			header: t(`${key}.status`),
			headerClassName: "w-32",
			cell: (constraint) =>
				constraint.status && (
					<Badge tone={statusTones[constraint.status]}>
						{t(`${key}.statuses.${constraint.status}`)}
					</Badge>
				),
			sortValue: (constraint) =>
				constraint.status ? CONSTRAINT_STATUSES.indexOf(constraint.status) : 0,
		},
	};
};
