import { useSuspenseQuery } from "@tanstack/react-query";
import {
	getRouteApi,
	useRouterState,
	type ErrorComponentProps,
} from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ApiProblemError } from "@/common/problem";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { ArrowLeftIcon, EditIcon } from "@/components/ui/Icon";
import {
	useCurrentCompanyId,
	useCurrentMembershipId,
} from "@/features/organisation/useCurrentCompanyId";
import { memberProfileQuery } from "@/features/people/api";
import { describeMemberRoles } from "@/features/people/memberRoles";
import { PeopleNotice } from "@/features/people/PeopleNotice";
import { peopleNoticeFrom } from "@/features/people/peopleNoticeState";
import { ProfileDetails } from "@/features/people/ProfileDetails";
import { profileEditAccess } from "@/features/people/profileEditAccess";
import { ProfileHeader } from "@/features/people/ProfileHeader";
import { ProfileMenu } from "@/features/people/ProfileMenu";
import { ProfileNotesAndSkills } from "@/features/people/ProfileNotesAndSkills";
import { useMemberRoles } from "@/features/people/useMemberRoles";
import { useCan } from "@/features/workspace/useCan";
import { PersonProfileEdit } from "@/pages/PersonProfileEdit";

const route = getRouteApi("/_authenticated/_app/people_/$membershipId");

const BackToPeople = (): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<Button leadingIcon={<ArrowLeftIcon />} to="/people" variant="textlink">
			{t("people.profile.back")}
		</Button>
	);
};

/**
 * One person's profile, read-only, or ready to change with `?edit=true` for
 * someone who may. Who may change it comes from where the profile is
 * filed: see `profileEditAccess`. A change just made is confirmed above the
 * profile.
 */
export const PersonProfile = (): FunctionComponent => {
	const { membershipId } = route.useParams();
	const { edit } = route.useSearch();
	const companyId = useCurrentCompanyId();
	const self = useCurrentMembershipId() === membershipId;
	const { t } = useTranslation();
	const can = useCan();
	const { data: profile } = useSuspenseQuery(
		memberProfileQuery(companyId, membershipId)
	);
	const access = profileEditAccess(profile, can);
	const roles = useMemberRoles(companyId, membershipId);
	const notice = peopleNoticeFrom(
		useRouterState({ select: (state) => state.location.state })
	);

	return (
		<>
			<BackToPeople />
			{notice && <PeopleNotice className="mt-6" notice={notice} />}
			<div className="mt-8">
				{edit && access ? (
					<PersonProfileEdit profile={profile} roles={roles} />
				) : (
					<>
						<ProfileHeader
							profile={profile}
							actions={
								<>
									{access && (
										<Button
											leadingIcon={<EditIcon />}
											params={{ membershipId }}
											search={{ edit: true }}
											to="/people/$membershipId"
											variant="secondary"
										>
											{t("people.profile.edit")}
										</Button>
									)}
									{access && (
										<ProfileMenu
											companyId={companyId}
											profile={profile}
											self={self}
										/>
									)}
								</>
							}
						/>
						<ProfileDetails
							className="mt-10"
							profile={profile}
							systemRoles={describeMemberRoles(roles, t)}
						/>
						<ProfileNotesAndSkills
							className="mt-6"
							companyId={companyId}
							noteActions="menu"
							profile={profile}
							skillsChangeable={access}
						/>
					</>
				)}
			</div>
		</>
	);
};

/**
 * Nobody (404), someone outside the units where the person may read
 * profiles (403), and a malformed id (400) all read the same, so the page
 * never says which it was.
 */
const isMissing = (error: unknown): boolean =>
	error instanceof ApiProblemError &&
	(error.status === 404 || error.status === 403 || error.status === 400);

/** Shown in place of the profile when it can't be loaded. */
export const PersonProfileProblem = ({
	error,
}: ErrorComponentProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<>
			<BackToPeople />
			<p className="mt-8 text-sm text-error-700" role="alert">
				{t(
					isMissing(error)
						? "people.profile.missing"
						: "people.profile.loadFailed"
				)}
			</p>
		</>
	);
};
