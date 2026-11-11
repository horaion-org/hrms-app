import { Fragment } from "react";
import { Trans, useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import type {
	ConstraintField,
	ConstraintType,
} from "@/features/scheduling/constraints/api";
import {
	constraintWords,
	sentencePartsOf,
	type SentenceValue,
} from "@/features/scheduling/constraints/constraintSentence";

export type ConstraintPreviewProps = {
	/** The constraint as filled in so far: its type and the values chosen. */
	constraint: { type: ConstraintType; values: Array<SentenceValue> };
	/** Every field the type takes; a field with no value yet shows its label. */
	fields: Array<ConstraintField>;
	className?: string;
};

/**
 * A constraint read back as its type's sentence while it is being built, with
 * each part marked as filled in or still to choose, and whether the constraint
 * is complete.
 */
export const ConstraintPreview = ({
	constraint,
	fields,
	className,
}: ConstraintPreviewProps): FunctionComponent => {
	const { t } = useTranslation();
	const words = constraintWords(constraint, t);
	const complete = fields.every(
		(field) => Boolean(words[field]) || field === "COMPARISON"
	);
	const parts = Object.fromEntries(
		fields.map((field) => {
			const value = words[field];
			return [
				field,
				<span
					key={field}
					className={joinClassNames(
						"inline-flex min-h-6 max-w-full items-center rounded border px-2 py-0.5 break-words",
						value
							? "border-ink-blue-200 bg-ink-blue-50 text-ink-blue-900"
							: "border-neutral-500 bg-neutral-300 text-neutral-600"
					)}
				>
					{value || t(`scheduling.constraints.fields.${field}`)}
				</span>,
			];
		})
	);

	return (
		<section
			aria-live="polite"
			className={joinClassNames(
				"rounded-lg border border-neutral-400 bg-neutral-100 px-4 py-3",
				className
			)}
		>
			<div className="flex items-center gap-3">
				<h3 className="text-sm font-semibold text-neutral-900">
					{t("scheduling.constraints.preview.title")}
				</h3>
				<Badge className="uppercase" tone={complete ? "success" : "error"}>
					{complete
						? t("scheduling.constraints.preview.complete")
						: t("scheduling.constraints.preview.incomplete")}
				</Badge>
			</div>
			<p className="mt-5 flex flex-wrap items-center gap-2 text-xs font-semibold text-neutral-900">
				{sentencePartsOf(constraint).map((part) => (
					<Fragment key={part.i18nKey}>
						<Trans
							components={parts}
							count={part.count}
							i18nKey={part.i18nKey}
						/>
					</Fragment>
				))}
			</p>
		</section>
	);
};
