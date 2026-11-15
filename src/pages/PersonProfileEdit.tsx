import { useNavigate } from "@tanstack/react-router";
import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { EmploymentTermsRow } from "@/features/employmentTerms/EmploymentTermsRow";
import type { MemberProfileDetail } from "@/features/people/api";
import {
	roleNames,
	rolesByPlace,
	type MemberRoles,
} from "@/features/people/memberRoles";
import { profileEditValues } from "@/features/people/profileRequest";
import { ProfileForm } from "@/features/people/ProfileForm";
import { ProfileHeader } from "@/features/people/ProfileHeader";
import { ProfileNotesAndSkills } from "@/features/people/ProfileNotesAndSkills";
import { PROFILE_FIELD_WIDTH } from "@/features/people/profileLayout";
import { personScope } from "@/features/people/profileEditAccess";
import { useEditProfile } from "@/features/people/useEditProfile";
import { scopeOfPlace } from "@/features/organisation/assignmentTargets";
import { useAccess } from "@/features/workspace/useAccess";
import { useCurrentCompanyId } from "@/features/workspace/useCurrentCompany";

export type PersonProfileEditProps = {
	profile: MemberProfileDetail;
	roles: MemberRoles;
};

/**
 * A person's profile, ready to change, under the same header as when read;
 * shown only to someone who may change it (see `profileEditAccess`). The
 * system role edits one assignment with its own target; other assignments
 * are listed but left alone. Their employment terms sit in the Employment
 * card with Change…, which records a dated change in its own dialog, not a
 * field of this form. Their skills are changed in their own card, each
 * change saved at once.
 */
export const PersonProfileEdit = ({
	profile,
	roles,
}: PersonProfileEditProps): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const navigate = useNavigate();
	const access = useAccess();
	const { t } = useTranslation();
	const termsId = useId();
	// Roles are read anywhere; where one may be assigned is checked per place below and in the form.
	const manageRole =
		access.canAnywhere("access_role:read") &&
		access.canAnywhere("access_role:assign");
	const ready = roles.status === "ready";
	const { selected, elsewhere } = rolesByPlace(
		ready ? roles.roles : [],
		profile.departmentId
	);
	// Replacing an assignment needs permission at its original target too.
	const rolePlace = selected
		? {
				branchId: selected.branchId ?? undefined,
				departmentId: selected.departmentId ?? undefined,
			}
		: undefined;
	const heldChangeable =
		!rolePlace || access.can("access_role:assign", scopeOfPlace(rolePlace));
	const save = useEditProfile(
		companyId,
		profile,
		manageRole && ready ? { held: selected } : undefined
	);

	// The form starts from the role they hold, so it waits for it.
	if (manageRole && roles.status === "pending")
		return (
			<p className="text-sm text-neutral-700">
				{t("organisation.list.loading")}
			</p>
		);
	return (
		<>
			<ProfileForm
				companyId={companyId}
				initial={profileEditValues(profile, selected?.accessRoleId)}
				edit={{
					employeeCode: profile.employeeCode,
					// Unknown counts as logged in: the API would refuse the change.
					emailEditable: profile.invitationPending === true,
					roleEditable: ready && heldChangeable,
					rolePlace,
					otherRoles: roleNames(elsewhere),
					header: (actions) => (
						<ProfileHeader actions={actions} profile={profile} />
					),
				}}
				employmentTermsField={
					access.can("member_employment_terms:read", personScope(profile))
						? (): ReactNode => (
								<FormRow
									fieldWidth={PROFILE_FIELD_WIDTH}
									htmlFor={termsId}
									label={t("people.form.employmentTerms")}
								>
									// Not a form control: the row is a group the label names, so
									a screen reader announces it.
									<div
										aria-labelledby={formRowIds(termsId).labelId}
										id={termsId}
										role="group"
									>
										<EmploymentTermsRow
											editing
											companyId={companyId}
											profile={profile}
										/>
									</div>
								</FormRow>
							)
						: undefined
				}
				onSubmit={save}
				onCancel={() => {
					void navigate({
						to: "/people/$membershipId",
						params: { membershipId: profile.membershipId },
						search: {},
						replace: true,
					});
				}}
			/>
			<ProfileNotesAndSkills
				skillsChangeable
				className="mt-6"
				companyId={companyId}
				noteActions="buttons"
				profile={profile}
			/>
		</>
	);
};
