import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { ChangePasswordForm } from "@/features/auth/ChangePasswordForm";

/** The signed-in person's own password, opened from the account menu. */
export const ChangePassword = (): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<>
			<h1 className="text-4xl font-medium text-neutral-900">
				{t("auth.changePassword.title")}
			</h1>
			<p className="mt-3 text-sm text-neutral-800">
				{t("auth.changePassword.subtitle")}
			</p>
			<div className="mt-10 max-w-xl rounded-xl border border-neutral-400 p-6">
				<ChangePasswordForm />
			</div>
		</>
	);
};
