import type { TFunction } from "i18next";
import type { ReactElement } from "react";
import { Trans } from "react-i18next";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import type { DataTableColumn } from "@/components/ui/DataTable";
import {
	CONSTRAINT_STATUSES,
	type ConstraintStatus,
} from "@/features/scheduling/constraints/api";
import {
	constraintWords,
	sentenceKey,
	type ConstraintWords,
} from "@/features/scheduling/constraints/constraintSentence";
import { ConstraintTypeTag } from "@/features/scheduling/constraints/ConstraintTypeTag";
import type { Constraint } from "@/features/scheduling/scheduleDraft";

/*
 * The columns every list of constraints shares, so a schedule's Constraints
 * step and the company's Scheduling policy read the same and later list work
 * changes one place: the name, the type with its category, the type's
 * sentence and the status. Each list adds its own columns around them.
 */

/** A row of a constraints list: a schedule's constraint or a company constraint. */
type ConstraintRow = Pick<
	Constraint,
	"name" | "type" | "category" | "requirement" | "values" | "status"
>;

export const statusTones: Record<ConstraintStatus, BadgeTone> = {
	ACTIVE: "success",
	INACTIVE: "neutral",
};

/** A sentence's slots in words, as the parts its tags are filled with. */
export const partsOf = (words: ConstraintWords): Record<string, ReactElement> =>
	Object.fromEntries(
		Object.entries(words).map(([slot, text]) => [
			slot,
			<span key={slot}>{text}</span>,
		])
	);

/** The shared columns, each placed by the list that uses it. */
export const constraintColumns = <Row extends ConstraintRow>(
	t: TFunction
): {
	name: DataTableColumn<Row>;
	type: DataTableColumn<Row>;
	details: DataTableColumn<Row>;
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
		type: {
			id: "type",
			header: t(`${key}.type`),
			headerClassName: "w-44",
			cell: (constraint) => (
				<div className="flex flex-col gap-1">
					<ConstraintTypeTag category={constraint.category} />
					{t(`${key}.types.${constraint.type}`)}
				</div>
			),
			sortValue: (constraint) =>
				`${t(`${key}.categories.${constraint.category}`)} ${t(`${key}.types.${constraint.type}`)}`,
		},
		details: {
			id: "details",
			header: t(`${key}.details`),
			cell: (constraint) => (
				<Trans
					components={partsOf(constraintWords(constraint, t))}
					i18nKey={sentenceKey(constraint.type)}
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
