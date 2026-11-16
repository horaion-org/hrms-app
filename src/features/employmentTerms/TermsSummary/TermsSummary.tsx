import { useState } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import type { ReadBack } from "@/features/employmentTerms/termsReadBack";

export type TermsSummaryProps = {
	/** What the terms on the form mean, or what is left to fill in. */
	readBack: ReadBack;
	className?: string;
};

/**
 * "These terms in words": the form's terms read back as a sentence, or what
 * is still to fill in, updated as the form changes and announced politely.
 * It sits beside the dialog's buttons, never over a field. On a phone it
 * keeps to one line until "Show all" opens it, so the fields keep the screen.
 */
export const TermsSummary = ({
	readBack,
	className,
}: TermsSummaryProps): FunctionComponent => {
	const { t } = useTranslation();
	const [expanded, setExpanded] = useState(false);
	return (
		<section
			aria-live="polite"
			className={joinClassNames(
				"rounded-lg bg-ink-blue-50 px-4 py-3",
				className
			)}
		>
			<h3 className="text-xs font-semibold text-ink-blue-900 uppercase">
				{t("employmentTerms.readBack.title")}
			</h3>
			<p
				className={joinClassNames(
					"mt-1 text-sm",
					readBack.complete ? "text-neutral-900" : "text-neutral-700",
					!expanded && "max-sm:line-clamp-1"
				)}
			>
				{readBack.text}
			</p>
			<Button
				aria-expanded={expanded}
				className="mt-1 sm:hidden"
				variant="textlink"
				onClick={() => {
					setExpanded(!expanded);
				}}
			>
				{t(
					expanded
						? "employmentTerms.readBack.showLess"
						: "employmentTerms.readBack.showAll"
				)}
			</Button>
		</section>
	);
};
