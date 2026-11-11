import { useId } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import {
	ConstraintStatement,
	type ConstraintStatementProps,
} from "@/features/scheduling/constraints/ConstraintStatement";

export type ConstraintPreviewProps = {
	/** The constraint as filled in so far. */
	constraint: ConstraintStatementProps["constraint"];
	/** Who it applies to, once there is something to name. */
	appliesTo?: string;
	className?: string;
};

/**
 * "How it reads": the constraint as it will read in the list while it is
 * being filled in, with grey words for what is not chosen yet.
 */
export const ConstraintPreview = ({
	constraint,
	appliesTo,
	className,
}: ConstraintPreviewProps): FunctionComponent => {
	const { t } = useTranslation();
	const titleId = useId();

	return (
		<section
			aria-labelledby={titleId}
			aria-live="polite"
			className={joinClassNames(
				"rounded-lg border border-neutral-400 bg-neutral-100 px-4 py-3",
				className
			)}
		>
			<h3 className="text-sm font-semibold text-neutral-900" id={titleId}>
				{t("scheduling.constraints.preview.title")}
			</h3>
			<ConstraintStatement
				placeholders
				appliesTo={appliesTo}
				className="mt-3 text-sm text-neutral-900"
				constraint={constraint}
			/>
		</section>
	);
};
