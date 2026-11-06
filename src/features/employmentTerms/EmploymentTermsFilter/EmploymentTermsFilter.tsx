import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Select } from "@/components/forms/Select";
import type { TermsChoice } from "@/features/employmentTerms/termsFilter";

/** The option value standing for every terms; never a real id. */
const ALL = "";

export type EmploymentTermsFilterProps = {
	/** The terms to offer, from `termsChoices`. */
	choices: ReadonlyArray<TermsChoice>;
	/** The chosen terms' id, or undefined for everyone. */
	value: string | undefined;
	/** Called with a terms id, or undefined for everyone. */
	onChange: (termsId: string | undefined) => void;
	/** Why the field cannot be used now, shown beneath it; the field is disabled while set. */
	disabledReason?: string;
};

/**
 * The "Employment terms" field of the People list's Filters panel, labelled
 * above its select like the Department field beside it: everyone, or the
 * people who hold one terms today. Disabled, with the reason beneath, when
 * the list shown cannot hold anyone on terms.
 */
export const EmploymentTermsFilter = ({
	choices,
	value,
	onChange,
	disabledReason,
}: EmploymentTermsFilterProps): FunctionComponent => {
	const { t } = useTranslation();
	const id = useId();
	return (
		<FormRow
			hint={disabledReason}
			htmlFor={id}
			label={t("employmentTerms.filter.label")}
			layout="stacked"
		>
			<Select
				aria-describedby={disabledReason ? formRowIds(id).hintId : undefined}
				aria-labelledby={formRowIds(id).labelId}
				className="w-full font-semibold"
				disabled={disabledReason !== undefined}
				value={disabledReason ? ALL : (value ?? ALL)}
				options={[
					{ value: ALL, label: t("employmentTerms.filter.all") },
					...choices.map((choice) => ({
						value: choice.id,
						label: choice.inactive
							? t("employmentTerms.filter.inactive", { name: choice.name })
							: choice.name,
					})),
				]}
				onChange={(termsId) => {
					onChange(termsId || undefined);
				}}
			/>
		</FormRow>
	);
};
