import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Select } from "@/components/forms/Select";
import type {
	EmploymentTerms,
	TermsReference,
} from "@/features/employmentTerms/api";
import { termsSentence } from "@/features/employmentTerms/summary";
import { PROFILE_FIELD_WIDTH } from "@/features/people/profileLayout";

export type EmploymentTermsFieldProps = {
	/** The company's active terms. */
	terms: ReadonlyArray<EmploymentTerms>;
	value: string;
	onChange: (termsId: string) => void;
	/** The figures to read the terms against, from the pickers' list. */
	reference?: TermsReference;
	disabled?: boolean;
};

/**
 * Add employee's "Employment terms" row, laid out as the profile form's
 * other rows: the active terms, starting on the Default, with what the
 * chosen terms mean under it. Full-time or part-time follows the terms, so
 * nothing is compared with an Employment type. They start on the hire date,
 * or today. Their own
 * hours are set afterwards from the profile row (see the handover).
 */
export const EmploymentTermsField = ({
	terms,
	value,
	onChange,
	reference,
	disabled = false,
}: EmploymentTermsFieldProps): FunctionComponent => {
	const { t } = useTranslation();
	const id = useId();
	const ids = formRowIds(id);
	const chosen = terms.find((each) => each.id === value);
	return (
		<>
			<FormRow
				fieldWidth={PROFILE_FIELD_WIDTH}
				htmlFor={id}
				label={t("people.form.employmentTerms")}
				hint={
					chosen
						? `${termsSentence(chosen, reference, t)} ${t("people.form.employmentTermsHint")}`
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
		</>
	);
};
