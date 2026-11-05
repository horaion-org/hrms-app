import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Select } from "@/components/forms/Select";
import type {
	EmploymentTerms,
	TermsReference,
} from "@/features/employmentTerms/api";
import { Callout } from "@/components/ui/Callout";
import { formatHours } from "@/features/employmentTerms/hours";
import { termsSentence } from "@/features/employmentTerms/summary";
import { partTimeMismatch } from "@/features/employmentTerms/termsChanges";
import { PROFILE_FIELD_WIDTH } from "@/features/people/profileLayout";

export type EmploymentTermsFieldProps = {
	/** The company's active terms. */
	terms: ReadonlyArray<EmploymentTerms>;
	value: string;
	onChange: (termsId: string) => void;
	/** The Employment type chosen in the same form, for the part-time mismatch warning. */
	employmentType?: string;
	/** The figures to read the terms against, from the pickers' list. */
	reference?: TermsReference;
	disabled?: boolean;
};

/**
 * Add employee's "Employment terms" row, laid out as the profile form's
 * other rows: the active terms, starting on the Default, with what the
 * chosen terms mean under it, and a warning when they disagree with the
 * Employment type chosen. They start on the hire date, or today. Their own
 * hours are set afterwards from the profile row (see the handover).
 */
export const EmploymentTermsField = ({
	terms,
	value,
	onChange,
	employmentType,
	reference,
	disabled = false,
}: EmploymentTermsFieldProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = i18n.resolvedLanguage ?? i18n.language ?? "en";
	const id = useId();
	const ids = formRowIds(id);
	const chosen = terms.find((each) => each.id === value);
	const mismatch = chosen
		? partTimeMismatch(
				employmentType || null,
				chosen.weekMinutes,
				null,
				reference?.partTimeBelowMinutes ?? null
			)
		: undefined;
	return (
		<>
			<FormRow
				fieldWidth={PROFILE_FIELD_WIDTH}
				htmlFor={id}
				label={t("people.form.employmentTerms")}
				hint={
					chosen
						? `${termsSentence(chosen, reference, t, language)} ${t("people.form.employmentTermsHint")}`
						: t("people.form.employmentTermsHint")
				}
			>
				<Select
					aria-describedby={ids.hintId}
					aria-labelledby={ids.labelId}
					className="w-full"
					disabled={disabled}
					value={value}
					options={terms.map((each) => ({
						value: each.id,
						label: each.name,
					}))}
					onChange={onChange}
				/>
			</FormRow>
			{mismatch && chosen && (
				<Callout tone="warning">
					{t(`employmentTerms.row.mismatch.${mismatch}`, {
						week: formatHours(chosen.weekMinutes, language),
					})}
				</Callout>
			)}
		</>
	);
};
