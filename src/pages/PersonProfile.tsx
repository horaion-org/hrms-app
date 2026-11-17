import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
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
import { placeLabels } from "@/features/organisation/accessSummary";
import { memberProfileQuery } from "@/features/people/api";
import {
	describeMemberAccess,
	describeMemberRoles,
} from "@/features/people/memberRoles";
import { PeopleNotice } from "@/features/people/PeopleNotice";
import { peopleNoticeFrom } from "@/features/people/peopleNoticeState";
import { ProfileDetails } from "@/features/people/ProfileDetails";
import {
	personScope,
	profileEditAccess,
} from "@/features/people/profileEditAccess";
import { ProfileHeader } from "@/features/people/ProfileHeader";
import { ProfileMenu } from "@/features/people/ProfileMenu";
import { ProfileNotesAndSkills } from "@/features/people/ProfileNotesAndSkills";
import { useMemberDefaultAccess } from "@/features/people/useMemberDefaultAccess";
import { useMemberRoles } from "@/features/people/useMemberRoles";
import { workspaceQuery } from "@/features/workspace/api";
import { retry } from "@/features/workspace/retry";
import { COMPANY_SCOPE } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";
import { EmploymentTermsRow } from "@/features/employmentTerms/EmploymentTermsRow";
import { TimeOffEarnedRow } from "@/features/employmentTerms/TimeOffEarnedRow";
import { useTimeOffEarned } from "@/features/employmentTerms/timeOffBalance";
import {
	useCurrentCompanyId,
	useCurrentMembershipId,
} from "@/features/workspace/useCurrentCompany";
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
 * profile. Read-only, it ends with what their system roles give them at
 * each place the reader can see, named from the workspace.
 */
export const PersonProfile = (): FunctionComponent => {
	const { membershipId } = route.useParams();
	const { edit } = route.useSearch();
	const companyId = useCurrentCompanyId();
	const self = useCurrentMembershipId() === membershipId;
	const { t } = useTranslation();
	const { can } = useAccess();
	const { data: profile } = useSuspenseQuery(
		memberProfileQuery(companyId, membershipId)
	);
	const access = profileEditAccess(profile, can);
	// Time off for extra hours, read where their terms may be read (API ADR-0126).
	const timeOff = useTimeOffEarned(companyId, membershipId, {
		self: false,
		allowed: can("member_employment_terms:read", personScope(profile)),
	});
	const roles = useMemberRoles(companyId, membershipId);
	const defaults = useMemberDefaultAccess(companyId, profile);
	const { data: workspace } = useQuery({ ...workspaceQuery, retry });
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
											// Only the System Owner and System Admin hold it (API ADR-0108).
											companyId={companyId}
											profile={profile}
											self={self}
											canChangeDefaultAccess={can(
												"access_role:assign",
												COMPANY_SCOPE
											)}
										/>
									)}
								</>
							}
						/>
						<ProfileDetails
							className="mt-10"
							profile={profile}
							systemRoles={describeMemberRoles(roles, t)}
							access={describeMemberAccess(
								roles,
								placeLabels(workspace, companyId, t),
								t,
								defaults
							)}
							employmentTerms={
								can("member_employment_terms:read", personScope(profile)) ? (
									<EmploymentTermsRow companyId={companyId} profile={profile} />
								) : undefined
							}
							timeOffEarned={
								timeOff && (
									<TimeOffEarnedRow
										balance={timeOff}
										displayName={profile.displayName}
									/>
								)
							}
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
