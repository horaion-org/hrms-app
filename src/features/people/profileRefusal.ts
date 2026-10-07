import type { TFunction } from "i18next";
import { ApiProblemError } from "@/common/problem";
import { mapRefusal, type Refusal } from "@/features/organisation/refusal";

/** The profile fields a refusal can land on, in the order they are shown. */
export const PROFILE_FIELDS = [
	"displayName",
	"dateOfBirth",
	"phone",
	"email",
	"employmentType",
	"hireDate",
	"probationEndDate",
	"status",
	"jobTitleId",
	"departmentId",
	"reportsTo",
] as const;

export type ProfileField = (typeof PROFILE_FIELDS)[number];

/**
 * The refusals of a change to an existing person, as `"<status> <errorCode>"`.
 * Every code an edit, a status change or an invitation can be refused with
 * is named here once, so a code the API settles on differently is a
 * one-line change.
 */
export const PROFILE_REFUSAL_CODES = {
	/** The email can be corrected only until the person first logs in. */
	emailChangeNotAllowed: "409 EMAIL_CHANGE_NOT_ALLOWED",
	/** The name belongs to a login the person also uses in another company. */
	identityShared: "409 IDENTITY_SHARED_ACROSS_COMPANIES",
	selfDeactivation: "409 CANNOT_DEACTIVATE_SELF",
	ownerDeactivation: "409 COMPANY_OWNER_CANNOT_BE_DEACTIVATED",
	/** The person was chosen as their own manager. */
	reportsToSelf: "400 REPORTS_TO_SELF",
	/** An inactive person can't be moved to another Department while they stay inactive. */
	inactiveMove: "400 INVALID_DEPARTMENT_MEMBER",
	/** Moving or deactivating them would leave their Department without a head. */
	lastDepartmentHead: "409 LAST_ACTIVE_DEPARTMENT_HEAD",
	/** Nobody, or nobody the person may see. */
	profileNotFound: "404 MEMBER_PROFILE_NOT_FOUND",
	invitationNotPending: "409 INVITATION_NOT_PENDING",
	/** The invitation email, after an email correction or a resend, couldn't be sent. */
	invitationNotDelivered: "502 INVITATION_NOT_DELIVERED",
	rateLimited: "429 RATE_LIMITED",
} as const;

const codes = PROFILE_REFUSAL_CODES;

/** What else an edit's refusal is read against; left out when adding a person. */
export type EditContext = {
	/** A 403 then means the new Department is one the person may not move people to. */
	departmentChanged: boolean;
};

/**
 * Server codes select frontend-owned copy; untrusted server prose is never
 * displayed. Given `edit`, the refusals of a change to an existing person
 * are read too, and the general copy speaks of saving rather than adding.
 */
export const profileRefusal = (
	error: unknown,
	t: TFunction,
	edit?: EditContext
): Refusal<ProfileField> => {
	const key = "people.form";
	const field = (name: ProfileField, message: string) =>
		({ field: name, message }) as const;
	if (
		edit?.departmentChanged &&
		error instanceof ApiProblemError &&
		error.status === 403
	)
		return {
			fields: { departmentId: t(`${key}.departmentForbidden`) },
			refreshMembers: false,
		};
	const department = field("departmentId", t(`${key}.departmentUnavailable`));
	const jobTitle = field("jobTitleId", t(`${key}.jobTitleUnavailable`));
	const rejected = t(`${key}.rejected`);
	const lastHead = t(`${key}.lastDepartmentHead`);
	return mapRefusal<ProfileField>(error, {
		codes: {
			"409 MEMBER_EMAIL_ALREADY_REGISTERED": field(
				"email",
				t(`${key}.emailTaken`)
			),
			// The chosen department, job title or manager changed since the lists loaded.
			"404 DEPARTMENT_NOT_FOUND": department,
			"404 BRANCH_NOT_FOUND": department,
			"409 DEPARTMENT_INACTIVE": department,
			"404 JOB_TITLE_NOT_FOUND": jobTitle,
			"409 JOB_TITLE_INACTIVE": jobTitle,
			"404 REPORTS_TO_NOT_FOUND": {
				...field("reportsTo", t(`${key}.managerUnavailable`)),
				refreshMembers: true,
			},
			...(edit && {
				[codes.emailChangeNotAllowed]: field("email", t(`${key}.emailLocked`)),
				[codes.identityShared]: field(
					"displayName",
					t(`${key}.identityShared`)
				),
				[codes.selfDeactivation]: field("status", t(`${key}.selfDeactivation`)),
				[codes.ownerDeactivation]: field(
					"status",
					t(`${key}.ownerDeactivation`)
				),
				[codes.reportsToSelf]: field("reportsTo", t(`${key}.managerSelf`)),
				[codes.inactiveMove]: field("departmentId", t(`${key}.inactiveMove`)),
				...(edit.departmentChanged && {
					[codes.lastDepartmentHead]: field("departmentId", lastHead),
				}),
			}),
		},
		alerts: {
			"400 IDENTITY_REJECTED": t(`${key}.identityRejected`),
			[codes.rateLimited]: t("auth.retryHold.later"),
			...(edit && {
				[codes.lastDepartmentHead]: lastHead,
				[codes.profileNotFound]: t(`${key}.profileMissing`),
				[codes.invitationNotDelivered]: t(`${key}.invitationNotDelivered`),
			}),
		},
		// A 400 names the request's fields; the manager is `reportsToMembershipId` there.
		fieldErrors: {
			displayName: field("displayName", rejected),
			dateOfBirth: field("dateOfBirth", t(`${key}.dateOfBirthPast`)),
			phone: field("phone", t(`${key}.phoneInvalid`)),
			email: field("email", t(`${key}.emailInvalid`)),
			employmentType: field("employmentType", rejected),
			hireDate: field("hireDate", rejected),
			probationEndDate: field(
				"probationEndDate",
				t(`${key}.probationBeforeHire`)
			),
			jobTitleId: field("jobTitleId", rejected),
			reportsToMembershipId: field("reportsTo", rejected),
			...(edit && {
				status: field("status", rejected),
				departmentId: field("departmentId", rejected),
			}),
		},
		forbidden: t(edit ? `${key}.forbiddenSave` : `${key}.forbiddenSubmit`),
		failed: t(edit ? `${key}.saveFailed` : `${key}.failed`),
	});
};

/**
 * Why deactivating, reactivating or re-inviting a person was refused, for
 * the dialog that asked. Never the API's own text.
 */
export const profileActionRefusal = (error: unknown, t: TFunction): string =>
	mapRefusal<never>(error, {
		alerts: {
			[codes.selfDeactivation]: t("people.form.selfDeactivation"),
			[codes.ownerDeactivation]: t("people.form.ownerDeactivation"),
			[codes.lastDepartmentHead]: t("people.form.lastDepartmentHead"),
			[codes.invitationNotPending]: t("people.profile.invitationNotPending"),
			[codes.invitationNotDelivered]: t("people.form.invitationNotDelivered"),
			[codes.profileNotFound]: t("people.form.profileMissing"),
			[codes.rateLimited]: t("auth.retryHold.later"),
		},
		forbidden: t("people.profile.actionForbidden"),
		failed: t("people.profile.actionFailed"),
	}).message ?? t("people.profile.actionFailed");
