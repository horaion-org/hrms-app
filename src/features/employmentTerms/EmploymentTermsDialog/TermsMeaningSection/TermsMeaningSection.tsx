import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import type { TermsReference } from "@/features/employmentTerms/api";
import { TermsFormPart } from "@/features/employmentTerms/EmploymentTermsDialog/TermsFormPart";
import { sampleWeek } from "@/features/employmentTerms/sampleWeek";
import {
	weekFieldsOf,
	type TermsFormValues,
} from "@/features/employmentTerms/termsForm";
import {
	readBackOf,
	termsEffects,
	termsExample,
} from "@/features/employmentTerms/termsReadBack";
import { TermsSummary } from "@/features/employmentTerms/TermsSummary";

export type TermsMeaningSectionProps = {
	/** The form's answers as they stand. */
	values: TermsFormValues;
	/** The country's figures, once loaded. */
	reference: TermsReference | undefined;
	partTime: boolean;
	className?: string;
};

/**
 * The dialog's third part, "What these terms mean": the form read back in
 * words, the sample week and what the terms change, at every keystroke.
 */
export const TermsMeaningSection = ({
	values,
	reference,
	partTime,
	className,
}: TermsMeaningSectionProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const fields = weekFieldsOf(values);
	return (
		<TermsFormPart
			className={className}
			title={t("employmentTerms.dialog.parts.termsMeaning")}
		>
			<TermsSummary
				effects={fields ? termsEffects(fields, reference, t) : []}
				example={fields ? termsExample(fields, reference, t) : undefined}
				readBack={readBackOf(values, reference, t, formattingLocale(i18n))}
				sampleWeek={
					fields
						? sampleWeek({
								daysPerWeek: fields.daysPerWeek,
								weekMinutes: fields.weekMinutes,
								dayMinutes: fields.dayMinutes,
								restDay: fields.restDay,
								partTime,
							})
						: undefined
				}
			/>
		</TermsFormPart>
	);
};
