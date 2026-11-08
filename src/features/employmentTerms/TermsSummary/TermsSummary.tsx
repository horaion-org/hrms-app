import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import type {
	TermsReference,
	WeekFields,
} from "@/features/employmentTerms/api";
import { termsSentence } from "@/features/employmentTerms/summary";

export type TermsSummaryProps = {
	/** The week so far; undefined while it is incomplete. */
	fields: WeekFields | undefined;
	/** The figures to read overtime against; without them overtime is left out. */
	reference: TermsReference | undefined;
	className?: string;
};

/**
 * What the terms being built mean, in plain words, updated as they change
 * and announced politely, in the box the constraint dialog's preview uses.
 */
export const TermsSummary = ({
	fields,
	reference,
	className,
}: TermsSummaryProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	return (
		<section
			aria-live="polite"
			className={joinClassNames(
				"rounded-lg border border-neutral-400 bg-neutral-100 px-4 py-3",
				className
			)}
		>
			<h3 className="text-sm font-semibold text-neutral-900">
				{t("employmentTerms.summary.title")}
			</h3>
			<p
				className={joinClassNames(
					"mt-2 text-sm",
					fields ? "text-neutral-900" : "text-neutral-700"
				)}
			>
				{fields
					? termsSentence(fields, reference, t, language)
					: t("employmentTerms.summary.incomplete")}
			</p>
		</section>
	);
};
