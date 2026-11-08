import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Select } from "@/components/forms/Select";
import {
	INVITATION_STATES,
	isInvitationState,
	type InvitationState,
} from "@/features/people/peopleSearch";

export type InvitationFilterProps = {
	/** Who is listed by sign-in, or everyone. */
	value?: InvitationState;
	onChange: (value: InvitationState | undefined) => void;
};

/**
 * The People list's "Signed in" field in the Filters panel, labelled above
 * its select like the fields beside it: everyone, only the people invited
 * who have not signed in yet (the rows marked Invited), or only those who
 * have.
 */
export const InvitationFilter = ({
	value,
	onChange,
}: InvitationFilterProps): FunctionComponent => {
	const { t } = useTranslation();
	const id = useId();
	return (
		<FormRow
			htmlFor={id}
			label={t("people.invitationFilter.label")}
			layout="stacked"
		>
			<Select
				aria-labelledby={formRowIds(id).labelId}
				className="w-full font-semibold"
				value={value ?? "all"}
				options={[
					{ value: "all", label: t("people.invitationFilter.all") },
					...INVITATION_STATES.map((state) => ({
						value: state,
						label: t(`people.invitationFilter.${state}`),
					})),
				]}
				onChange={(next) => {
					onChange(isInvitationState(next) ? next : undefined);
				}}
			/>
		</FormRow>
	);
};
