import type { TFunction } from "i18next";

/** What the remarks field says: its label, hint, placeholder and, when it is required, the message for an empty one. */
export type RemarksText = {
	label: string;
	hint: string;
	placeholder: string;
	missing?: string;
};

/**
 * The remarks field's words: the reviewer's remark when recording approved
 * leave, the applicant's reason when the leave type asks for one, otherwise
 * optional remarks.
 */
export const remarksText = (
	t: TFunction,
	recording: boolean,
	reasonRequired: boolean
): RemarksText => {
	if (recording)
		return {
			label: t("leave.remark"),
			hint: t("leave.remarkHintEmployee"),
			placeholder: t("leave.leaveReasonPlaceholder"),
			missing: t("leave.remarkRequired"),
		};
	if (reasonRequired)
		return {
			label: t("leave.leaveReason"),
			hint: t("leave.leaveReasonHint"),
			placeholder: t("leave.leaveReasonPlaceholder"),
			missing: t("leave.leaveReasonRequired"),
		};
	return {
		label: t("leave.remarksOptional"),
		hint: t("leave.remarksHint"),
		placeholder: t("leave.remarksPlaceholder"),
	};
};
