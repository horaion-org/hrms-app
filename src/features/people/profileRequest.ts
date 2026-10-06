import type { CreateMemberProfileBody } from "@/features/people/api";
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
