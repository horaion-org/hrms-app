import { useController, type Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Checkbox } from "@/components/ui/Checkbox";
import type { ProfileFormValues } from "@/features/people/profileFormSchema";
import { PROFILE_FIELD_WIDTH } from "@/features/people/profileLayout";

export type InvitationChoiceProps = {
	control: Control<ProfileFormValues>;
	disabled?: boolean;
};

const key = "people.form";

/**
 * Add employee's "Send an invitation now", under the email address: ticked,
 * the person is emailed as they are added; unticked, nobody is emailed and
 * they are invited later from their profile.
 */
export const InvitationChoice = ({
	control,
	disabled,
}: InvitationChoiceProps): FunctionComponent => {
	const { t } = useTranslation();
	const { field } = useController({ control, name: "sendInvitation" });
	const sending = field.value === true;
	return (
		<Checkbox
			checked={sending}
			className={joinClassNames("w-full sm:ml-auto", PROFILE_FIELD_WIDTH)}
			disabled={disabled}
			label={t(`${key}.sendInvitation`)}
			name={field.name}
			description={
				sending ? t(`${key}.emailHint`) : t(`${key}.noInvitationHint`)
			}
			onBlur={field.onBlur}
			onChange={(event) => {
				field.onChange(event.target.checked);
			}}
		/>
	);
};
