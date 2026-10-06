import type { TFunction } from "i18next";
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
	"jobTitleId",
	"departmentId",
	"reportsTo",
] as const;

export type ProfileField = (typeof PROFILE_FIELDS)[number];

/** Server codes select frontend-owned copy; untrusted server prose is never displayed. */
export const profileRefusal = (
	error: unknown,
	t: TFunction
): Refusal<ProfileField> => {
	const key = "people.form";
	const field = (name: ProfileField, message: string) =>
		({ field: name, message }) as const;
	const department = field("departmentId", t(`${key}.departmentUnavailable`));
	const jobTitle = field("jobTitleId", t(`${key}.jobTitleUnavailable`));
	const rejected = t(`${key}.rejected`);
	return mapRefusal<ProfileField>(error, {
		codes: {
			"409 MEMBER_EMAIL_ALREADY_REGISTERED": field(
				"email",
				t(`${key}.emailTaken`)
			),
			// The chosen department, job title or manager changed since the lists loaded.
			"404 DEPARTMENT_NOT_FOUND": department,
			"409 DEPARTMENT_INACTIVE": department,
			"404 JOB_TITLE_NOT_FOUND": jobTitle,
			"409 JOB_TITLE_INACTIVE": jobTitle,
			"404 REPORTS_TO_NOT_FOUND": {
				...field("reportsTo", t(`${key}.managerUnavailable`)),
				refreshMembers: true,
			},
		},
		alerts: {
			"400 IDENTITY_REJECTED": t(`${key}.identityRejected`),
			"429 RATE_LIMITED": t("auth.retryHold.later"),
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
		},
		forbidden: t(`${key}.forbiddenSubmit`),
		failed: t(`${key}.failed`),
	});
};
