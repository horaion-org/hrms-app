import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { EMPTY_PROFILE } from "@/features/people/profileFormSchema";
import { ProfileForm } from "@/features/people/ProfileForm";
import {
	useAddEmployee,
	type ChosenTerms,
} from "@/features/people/useAddEmployee";
import { Can } from "@/features/workspace/Can";
import { useAccess } from "@/features/workspace/useAccess";
import {
	activeTermsQuery,
	type EmploymentTerms,
} from "@/features/employmentTerms/api";
import { EmploymentTermsField } from "@/features/employmentTerms/EmploymentTermsField";

/**
 * A new person in a Department where the caller may add employees, or without one
 * when the caller may add them company-wide, emailed an invitation to log in.
 */
/** The terms picked and the Default, for `useAddEmployee`; nothing when the list didn't load. */
const chosenTermsOf = (
	list: ReadonlyArray<EmploymentTerms> | undefined,
	termsId: string
): ChosenTerms | undefined => {
	const chosen = list?.find((each) => each.id === termsId);
	const defaultTerms = list?.find((each) => each.isDefault);
	return chosen && defaultTerms
		? {
				id: chosen.id,
				name: chosen.name,
				defaultTerms: { id: defaultTerms.id, name: defaultTerms.name },
			}
		: undefined;
};

export const AddEmployee = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const navigate = useNavigate();
	const { t } = useTranslation();
	const add = useAddEmployee(companyId);
	// Terms are offered to whoever may set them somewhere; the API checks the chosen Department.
	const access = useAccess();
	const canSetTerms = access.canAnywhere("member_employment_terms:update");
	const terms = useQuery(activeTermsQuery(companyId, canSetTerms));
	const [chosenTermsId, setChosenTermsId] = useState<string>();
	const termsId =
		chosenTermsId ?? terms.data?.terms.find((each) => each.isDefault)?.id ?? "";

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
				employmentTermsField={
					terms.data && terms.data.terms.length > 0
						? (employmentType: string): ReactNode => (
								<EmploymentTermsField
									employmentType={employmentType}
									reference={terms.data.reference}
									terms={terms.data.terms}
									value={termsId}
									onChange={setChosenTermsId}
								/>
							)
						: undefined
				}
				onCancel={() => {
					void navigate({ to: "/people" });
				}}
				onSubmit={(values, place, role) =>
					add(values, place, role, chosenTermsOf(terms.data?.terms, termsId))
				}
			/>
		</Can>
	);
};
