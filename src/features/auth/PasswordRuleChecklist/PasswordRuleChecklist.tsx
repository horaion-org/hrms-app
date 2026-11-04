import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { TickIcon } from "@/components/ui/Icon";
import {
	passwordRuleIds,
	unmetPasswordRules,
	type PasswordRuleId,
} from "@/features/auth/passwordRules";

type ChecklistRule = PasswordRuleId | "different";
const checklistRules: ReadonlyArray<ChecklistRule> = [
	...passwordRuleIds,
	"different",
];

/** The rules the new password does not meet yet, the "different" rule included. */
const unmetChecklistRules = (
	password: string,
	currentPassword: string
): Set<ChecklistRule> => {
	const unmet = new Set<ChecklistRule>(unmetPasswordRules(password));
	if (password === currentPassword) unmet.add("different");
	return unmet;
};

export type PasswordRuleChecklistProps = {
	id: string;
	password: string;
	currentPassword: string;
};

/**
 * Live feedback under a new password field. Every rule reads as neutral until
 * the person starts typing, so nothing looks wrong on first view.
 */
export const PasswordRuleChecklist = ({
	id,
	password,
	currentPassword,
}: PasswordRuleChecklistProps): FunctionComponent => {
	const { t } = useTranslation();
	const unmet = unmetChecklistRules(password, currentPassword);
	const started = password.length > 0;
	return (
		<div className="space-y-2" id={id}>
			<p className="text-sm text-neutral-800" id={`${id}-label`}>
				{t("auth.changePassword.rulesLabel")}
			</p>
			<ul aria-labelledby={`${id}-label`} className="grid gap-1 sm:grid-cols-2">
				{checklistRules.map((rule) => {
					const met = started && !unmet.has(rule);
					return (
						<li
							key={rule}
							className={joinClassNames(
								"flex items-center gap-2 text-sm",
								met ? "text-success-800" : "text-neutral-700"
							)}
						>
							{met ? (
								<TickIcon className="size-4 shrink-0" />
							) : (
								<span
									aria-hidden="true"
									className="mx-1.5 size-1 shrink-0 rounded-full bg-current"
								/>
							)}
							<span>{t(`auth.changePassword.rules.${rule}`)}</span>
							<span className="sr-only">
								{t(
									met
										? "auth.changePassword.ruleMet"
										: "auth.changePassword.ruleUnmet"
								)}
							</span>
						</li>
					);
				})}
			</ul>
		</div>
	);
};
