import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import type { ReadBack } from "@/features/employmentTerms/termsReadBack";

export type TermsSummaryProps = {
	/** What the terms on the form mean, or what is left to fill in. */
	readBack: ReadBack;
	className?: string;
};

/**
 * "These terms in words": the form's terms read back as a sentence, or what
 * is still to fill in, updated as the form changes and announced politely.
 */
export const TermsSummary = ({
	readBack,
	className,
}: TermsSummaryProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<section
			aria-live="polite"
			className={joinClassNames(
				"border-b border-ink-blue-100 bg-ink-blue-50 py-4",
				className
			)}
		>
			<h3 className="text-xs font-semibold text-ink-blue-900 uppercase">
				{t("employmentTerms.readBack.title")}
			</h3>
			<p
				className={joinClassNames(
					"mt-1 text-sm",
					readBack.complete ? "text-neutral-900" : "text-neutral-700"
				)}
			>
				{readBack.text}
			</p>
		</section>
	);
};
