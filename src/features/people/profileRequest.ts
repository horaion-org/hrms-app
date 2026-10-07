import type {
	CreateMemberProfileBody,
	MemberProfileDetail,
	MemberStatus,
	UpdateMemberProfileBody,
} from "@/features/people/api";
import type { ProfileFormValues } from "@/features/people/profileFormSchema";

/**
 * The create request for a filled-in profile. Fields left empty are left out,
 * never sent as "", which the API rejects. The Department goes in the URL and
 * a system role is assigned separately, so neither is part of the body.
 */
export const profileRequest = ({
	displayName,
	email,
	jobTitleId,
	reportsTo,
	dateOfBirth,
	phone,
	employmentType,
	hireDate,
	probationEndDate,
}: ProfileFormValues): CreateMemberProfileBody => ({
	displayName: displayName.trim(),
	email: email.trim(),
	...(jobTitleId && { jobTitleId }),
	...(reportsTo && { reportsToMembershipId: reportsTo.membershipId }),
	...(dateOfBirth && { dateOfBirth }),
	...(phone && { phone }),
	...(employmentType && { employmentType }),
	...(hireDate && { hireDate }),
	...(probationEndDate && { probationEndDate }),
});

/** A profile as the form holds it, with the status it is saved with. */
export type ProfileEditValues = ProfileFormValues & { status: MemberStatus };

/**
 * The update request for an edited profile. `PUT` replaces the profile, so
 * every field is sent and an empty one is null, never "". A system role is
 * assigned separately, so it is not part of the body.
 */
export const profileUpdateRequest = ({
	displayName,
	email,
	status,
	departmentId,
	jobTitleId,
	reportsTo,
	dateOfBirth,
	phone,
	employmentType,
	hireDate,
	probationEndDate,
}: ProfileEditValues): UpdateMemberProfileBody => ({
	displayName: displayName.trim(),
	email: email.trim(),
	status,
	departmentId,
	jobTitleId: jobTitleId || null,
	reportsToMembershipId: reportsTo?.membershipId ?? null,
	dateOfBirth: dateOfBirth || null,
	phone: phone || null,
	employmentType: employmentType || null,
	hireDate: hireDate || null,
	probationEndDate: probationEndDate || null,
});

/**
 * A saved profile as the form starts from it, with the system role it holds
 * in its Department, if any.
 */
export const profileEditValues = (
	profile: MemberProfileDetail,
	accessRoleId = ""
): ProfileEditValues => ({
	displayName: profile.displayName,
	dateOfBirth: profile.dateOfBirth ?? "",
	phone: profile.phone ?? "",
	email: profile.email,
	employmentType: profile.employmentType ?? "",
	hireDate: profile.hireDate ?? "",
	probationEndDate: profile.probationEndDate ?? "",
	jobTitleId: profile.jobTitleId ?? "",
	departmentId: profile.departmentId ?? "",
	// Only an active member can be chosen as a manager, so the current one is shown as one.
	reportsTo: profile.reportsTo && { ...profile.reportsTo, status: "ACTIVE" },
	accessRoleId,
	status: profile.status,
});
