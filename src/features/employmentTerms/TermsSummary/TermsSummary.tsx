import { useState } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { SampleWeek } from "@/features/employmentTerms/SampleWeek";
import type { SampleWeek as SampleWeekModel } from "@/features/employmentTerms/sampleWeek";
import type { ReadBack } from "@/features/employmentTerms/termsReadBack";

export type TermsSummaryProps = {
	/** What the terms on the form mean, or what is left to fill in. */
	readBack: ReadBack;
	/** The week the terms make, drawn once the terms are complete. */
	sampleWeek?: SampleWeekModel;
	/** The sample week's example in figures (`termsExample`). */
	example?: string;
	/** "What this changes", one line each (`termsEffects`). */
	effects?: ReadonlyArray<string>;
	className?: string;
};

/**
 * The form's read-back, the approved design's: "These terms in words" (the
 * sentence, or what is still to fill in, announced politely), then, once the
 * terms are complete, a sample week with its example and "What this
 * changes". It sits beside the form, never over a field; on a phone it
 * follows the form and the sentence keeps to one line until "Show all".
 */
export const TermsSummary = ({
	readBack,
	sampleWeek,
	example,
	effects = [],
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
			{readBack.complete && sampleWeek && (
				<div className="mt-4 flex flex-col gap-2">
					<h3 className="text-xs font-semibold text-ink-blue-900 uppercase">
						{t("employmentTerms.sampleWeek.title")}
					</h3>
					<SampleWeek week={sampleWeek} />
					{example && <p className="text-sm text-neutral-800">{example}</p>}
				</div>
			)}
			{readBack.complete && effects.length > 0 && (
				<div className="mt-4 flex flex-col gap-2">
					<h3 className="text-xs font-semibold text-ink-blue-900 uppercase">
						{t("employmentTerms.readBack.doesTitle")}
					</h3>
					<ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-neutral-800">
						{effects.map((effect) => (
							<li key={effect}>{effect}</li>
						))}
					</ul>
				</div>
			)}
		</section>
	);
};
