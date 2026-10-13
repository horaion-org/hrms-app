import { Trans, useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import type { ConstraintType } from "@/features/scheduling/constraints/api";
import {
	sentenceKey,
	type ConstraintSlot,
	type ConstraintWords,
} from "@/features/scheduling/constraints/constraintSentence";

export type ConstraintPreviewProps = {
	/** The constraint's type, whose sentence is read. */
	type: ConstraintType;
	/** Every slot the type's sentence has (see `sentenceSlotsOf`). */
	slots: Array<ConstraintSlot>;
	/** The slots chosen so far, in words (see `constraintWords`); a missing or empty one shows its label. */
	words: ConstraintWords;
	className?: string;
};

/**
 * A constraint read back as its type's sentence while it is being built, with
 * each part marked as filled in or still to choose, and whether the constraint
 * is complete.
 */
export const ConstraintPreview = ({
	type,
	slots,
	words,
	className,
}: ConstraintPreviewProps): FunctionComponent => {
	const { t } = useTranslation();
	const complete = slots.every((slot) => Boolean(words[slot]));
	const parts = Object.fromEntries(
		slots.map((slot) => {
			const value = words[slot];
			return [
				slot,
				<span
					key={slot}
					className={joinClassNames(
						"inline-flex min-h-6 max-w-full items-center rounded border px-2 py-0.5 break-words",
						value
							? "border-ink-blue-200 bg-ink-blue-50 text-ink-blue-900"
							: "border-neutral-500 bg-neutral-300 text-neutral-600"
					)}
				>
					{value ||
						(slot === "REQUIREMENT"
							? t("scheduling.constraints.requirement")
							: t(`scheduling.constraints.fields.${slot}`))}
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
				<Trans components={parts} i18nKey={sentenceKey(type)} />
			</p>
		</section>
	);
};
