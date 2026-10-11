import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { EMPTY_PROFILE } from "@/features/people/profileFormSchema";
import { ProfileForm } from "@/features/people/ProfileForm";
import { useAddEmployee } from "@/features/people/useAddEmployee";
import { Can } from "@/features/workspace/Can";

/**
 * A new person in one of the Departments where the person may add
 * employees, who is then emailed an invitation to log in.
 */
export const AddEmployee = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const navigate = useNavigate();
	const { t } = useTranslation();
	const add = useAddEmployee(companyId);

	return (
		<Can
			at="anywhere"
			permission="member_profile:create"
			fallback={
				<>
					<h1 className="text-4xl font-medium text-neutral-900">
						{t("people.form.title")}
					</h1>
					<p className="mt-4 text-sm text-neutral-700">
						{t("people.form.forbidden")}
					</p>
				</>
			}
		>
			<ProfileForm
				companyId={companyId}
				description={t("people.form.subtitle")}
				initial={EMPTY_PROFILE}
				title={t("people.form.title")}
				onSubmit={add}
				onCancel={() => {
					void navigate({ to: "/people" });
				}}
			/>
		</Can>
	);
};
