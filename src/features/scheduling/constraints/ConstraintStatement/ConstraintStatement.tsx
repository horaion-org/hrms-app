import { Fragment, type ReactElement } from "react";
import { Trans, useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import {
	CONSTRAINT_FIELDS,
	type ConstraintRequirement,
	type ConstraintType,
	type RequirementPolicy,
} from "@/features/scheduling/constraints/api";
import {
	constraintWords,
	firmnessOf,
	sentencePartsOf,
	type SentenceValue,
} from "@/features/scheduling/constraints/constraintSentence";
import { problemLines } from "@/features/scheduling/constraints/valueProblems";

export type ConstraintStatementProps = {
	constraint: {
		type: ConstraintType;
		/** Null for a type that gives no choice, or while none is chosen. */
		requirement: ConstraintRequirement | null;
		values: ReadonlyArray<SentenceValue>;
		/** Whether its type covers full-timers only, which its sentence says; absent reads as everyone. */
		fullTimersOnly?: boolean;
		/** How its type runs, for the tag of a type that offers no choice; absent shows no fixed tag. */
		requirementPolicy?: RequirementPolicy;
	};
	/** Who it applies to, as a muted line under the sentence (see `appliesToOf`). */
	appliesTo?: string;
	/** While it is being filled in: a field with no value yet shows a grey word such as "which shift". */
	placeholders?: boolean;
	className?: string;
};

/** The fields a sentence names; the comparison is part of the sentence's wording. */
const NAMED_FIELDS = CONSTRAINT_FIELDS.filter(
	(field) => field !== "COMPARISON"
);

/**
 * A constraint as one reads it: a Must or If possible tag, which says on
 * hover what happens when it can't be met, then its sentence, with each
 * field holding a value that no longer fits marked, under it who it applies
 * to, and one line per such value saying what to do. The constraint lists
 * and the dialog's preview show it.
 */
export const ConstraintStatement = ({
	constraint,
	appliesTo,
	placeholders = false,
	className,
}: ConstraintStatementProps): FunctionComponent => {
	const { t } = useTranslation();
	const key = "scheduling.constraints";
	const firmness = firmnessOf(constraint);
	// While being filled in, a constraint with no firmness chosen yet says both are open.
	const tag = firmness
		? t(`${key}.requirements.${firmness}`)
		: placeholders
			? t(`${key}.requirements.unset`)
			: undefined;
	const tagTitle = firmness ? t(`${key}.firmness.${firmness}`) : undefined;
	const words = constraintWords(constraint, t);
	const fieldsWithProblems = new Set(
		constraint.values
			.filter((value) => value.problem)
			.map((value) => value.field)
	);
	const problems = problemLines(constraint.values, t);
	const parts: Record<string, ReactElement> = Object.fromEntries(
		NAMED_FIELDS.map((field) => {
			const text = words[field];
			return [
				field,
				text === undefined && placeholders ? (
					<span key={field} className="text-neutral-600">
						{t(`${key}.placeholders.${field}`)}
					</span>
				) : (
					<span
						key={field}
						className={
							fieldsWithProblems.has(field)
								? "font-semibold text-warning-700"
								: undefined
						}
					>
						{text}
					</span>
				),
			];
		})
	);

	return (
		<div className={joinClassNames("flex flex-col gap-1", className)}>
			<p>
				{tag && (
					<>
						<Badge compact className="mr-1" title={tagTitle}>
							{tag}
						</Badge>{" "}
					</>
				)}
				{sentencePartsOf(constraint).map((part, index) => (
					<Fragment key={part.i18nKey}>
						{index > 0 && " "}
						<Trans
							components={parts}
							count={part.count}
							i18nKey={part.i18nKey}
						/>
					</Fragment>
				))}
			</p>
			{appliesTo && <p className="text-xs text-neutral-700">{appliesTo}</p>}
			{problems.map((line) => (
				<p key={line} className="text-xs text-warning-700">
					{line}
				</p>
			))}
		</div>
	);
};
