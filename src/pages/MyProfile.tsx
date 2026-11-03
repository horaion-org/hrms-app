import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { myProfileQuery } from "@/features/people/api";
import { ProfileDetails } from "@/features/people/ProfileDetails";
import { ProfileHeader } from "@/features/people/ProfileHeader";

/**
 * The caller's own profile in the current company, read-only: the same
 * header and cards as a colleague's page, without the actions. The API
 * resolves the member from the caller, so nothing here names anyone.
 */
export const MyProfile = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { t } = useTranslation();
	const { data: profile } = useSuspenseQuery(myProfileQuery(companyId));
	return (
		<>
			<p className="text-sm text-neutral-800">
				{t("people.profile.mineSubtitle")}
			</p>
			<div className="mt-8">
				<ProfileHeader profile={profile} />
				<ProfileDetails className="mt-10" profile={profile} />
			</div>
		</>
	);
};

/** Shown in place of the page when the profile could not be read. */
export const MyProfileProblem = (): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<p className="text-sm text-error-700" role="alert">
			{t("people.profile.mineFailed")}
		</p>
	);
};
