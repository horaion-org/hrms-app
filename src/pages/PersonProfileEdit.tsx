import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
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
import { useEditProfile } from "@/features/people/useEditProfile";
import { useMemberSkills, useSkillsDraft } from "@/features/people/useSkills";
import { useCan } from "@/features/workspace/useCan";

export type PersonProfileEditProps = {
	profile: MemberProfileDetail;
	roles: MemberRoles;
};

/**
 * A person's profile, ready to change, under the same header as when read;
 * shown only to someone who may change it (see `profileEditAccess`). The
 * system role here is the one they hold at their Department; roles held
 * elsewhere are listed but left alone. Changes to their skills are held
 * until the profile is saved.
 */
export const PersonProfileEdit = ({
	profile,
	roles,
}: PersonProfileEditProps): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const navigate = useNavigate();
	const can = useCan();
	const { t } = useTranslation();
	// The same keys Add employee asks for before offering a role.
	const manageRole = can("access_role:read") && can("access_role:assign");
	const ready = roles.status === "ready";
	const { atDepartment, elsewhere } = rolesByPlace(
		ready ? roles.roles : [],
		profile.departmentId
	);
	const skillsDraft = useSkillsDraft(
		useMemberSkills(companyId, profile.membershipId).data
	);
	const save = useEditProfile(
		companyId,
		profile,
		manageRole && ready ? { held: atDepartment } : undefined,
		skillsDraft.changed ? skillsDraft.skills : undefined
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
				initial={profileEditValues(profile, atDepartment?.accessRoleId)}
				edit={{
					employeeCode: profile.employeeCode,
					roleEditable: ready,
					otherRoles: roleNames(elsewhere),
					unsaved: skillsDraft.changed,
					header: (actions) => (
						<ProfileHeader actions={actions} profile={profile} />
					),
				}}
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
				skillsDraft={skillsDraft}
			/>
		</>
	);
};
