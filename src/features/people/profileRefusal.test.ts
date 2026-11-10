import type { ParseKeys } from "i18next";
import { describe, expect, it } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	profileActionRefusal,
	profileRefusal,
} from "@/features/people/profileRefusal";

const t = authTestI18n.t.bind(authTestI18n);

/** The app's own copy for `key`; fails when the key is missing, so a table cannot point at nothing. */
const copy = (key: ParseKeys): string => {
	expect(authTestI18n.exists(key), key).toBe(true);
	return t(key);
};

const problem = (
	status: number,
	errorCode?: string,
	fields: Array<string> = []
): ApiProblemError =>
	new ApiProblemError({
		message: "API says no",
		status,
		errorCode,
		fieldErrors: fields.map((field) => ({ field, message: "API says no" })),
		reason: "http",
	});

const fromCode = (
	code: string,
	fields: Array<string> = []
): ApiProblemError => {
	const [status, errorCode] = code.split(" ");
	return problem(Number(status), errorCode, fields);
};

const EDIT = { departmentChanged: false };
const MOVE = { departmentChanged: true };

describe("profileRefusal, adding or editing", () => {
	it.each([
		["409 MEMBER_EMAIL_ALREADY_REGISTERED", "email", "people.form.emailTaken"],
		[
			"404 DEPARTMENT_NOT_FOUND",
			"departmentId",
			"people.form.departmentUnavailable",
		],
		[
			"404 BRANCH_NOT_FOUND",
			"departmentId",
			"people.form.departmentUnavailable",
		],
		[
			"409 DEPARTMENT_INACTIVE",
			"departmentId",
			"people.form.departmentUnavailable",
		],
		[
			"404 JOB_TITLE_NOT_FOUND",
			"jobTitleId",
			"people.form.jobTitleUnavailable",
		],
		["409 JOB_TITLE_INACTIVE", "jobTitleId", "people.form.jobTitleUnavailable"],
		[
			"400 JOB_TITLE_REQUIRES_DEPARTMENT",
			"jobTitleId",
			"people.form.jobTitleNeedsDepartment",
		],
	] as const)("puts %s on %s", (code, field, key) => {
		expect(profileRefusal(fromCode(code), t)).toEqual({
			fields: { [field]: copy(key) },
			refreshMembers: false,
		});
	});

	it("puts a manager who is gone on the manager field and reloads the people", () => {
		expect(profileRefusal(fromCode("404 REPORTS_TO_NOT_FOUND"), t)).toEqual({
			fields: { reportsTo: copy("people.form.managerUnavailable") },
			refreshMembers: true,
		});
	});

	it.each([
		["400 IDENTITY_REJECTED", "people.form.identityRejected"],
		["429 RATE_LIMITED", "auth.retryHold.later"],
	] as const)("answers %s with %s", (code, key) => {
		expect(profileRefusal(fromCode(code), t).message).toBe(copy(key));
	});

	it.each([
		["displayName", "displayName", "people.form.rejected"],
		["dateOfBirth", "dateOfBirth", "people.form.dateOfBirthPast"],
		["phone", "phone", "people.form.phoneInvalid"],
		["email", "email", "people.form.emailInvalid"],
		["employmentType", "employmentType", "people.form.rejected"],
		["hireDate", "hireDate", "people.form.rejected"],
		["probationEndDate", "probationEndDate", "people.form.probationBeforeHire"],
		["jobTitleId", "jobTitleId", "people.form.rejected"],
		["reportsToMembershipId", "reportsTo", "people.form.rejected"],
	] as const)("places the API's %s rule on %s", (apiField, field, key) => {
		expect(
			profileRefusal(problem(400, undefined, [apiField]), t).fields
		).toEqual({ [field]: copy(key) });
	});

	it("speaks of adding when adding and of saving when editing", () => {
		expect(profileRefusal(problem(403), t).message).toBe(
			copy("people.form.forbiddenSubmit")
		);
		expect(profileRefusal(problem(500), t).message).toBe(
			copy("people.form.failed")
		);
		expect(profileRefusal(problem(403), t, EDIT).message).toBe(
			copy("people.form.forbiddenSave")
		);
		expect(profileRefusal(new Error("offline"), t, EDIT).message).toBe(
			copy("people.form.saveFailed")
		);
	});
});

describe("profileRefusal, editing only", () => {
	it.each([
		["409 EMAIL_CHANGE_NOT_ALLOWED", "email", "people.form.emailLocked"],
		[
			"409 IDENTITY_SHARED_ACROSS_COMPANIES",
			"displayName",
			"people.form.identityShared",
		],
		["409 CANNOT_DEACTIVATE_SELF", "status", "people.form.selfDeactivation"],
		[
			"409 COMPANY_OWNER_CANNOT_BE_DEACTIVATED",
			"status",
			"people.form.ownerDeactivation",
		],
		["400 REPORTS_TO_SELF", "reportsTo", "people.form.managerSelf"],
		[
			"400 INVALID_DEPARTMENT_MEMBER",
			"departmentId",
			"people.form.inactiveMove",
		],
	] as const)("puts %s on %s, and only when editing", (code, field, key) => {
		expect(profileRefusal(fromCode(code), t, EDIT).fields).toEqual({
			[field]: copy(key),
		});
		expect(profileRefusal(fromCode(code), t).fields).toEqual({});
	});

	it.each([
		["404 MEMBER_PROFILE_NOT_FOUND", "people.form.profileMissing"],
		["502 INVITATION_NOT_DELIVERED", "people.form.invitationNotDelivered"],
	] as const)("answers %s with %s", (code, key) => {
		expect(profileRefusal(fromCode(code), t, EDIT).message).toBe(copy(key));
	});

	it("puts the last head on the Department when the Department changed, else says it in the alert", () => {
		const lastHead = fromCode("409 LAST_ACTIVE_DEPARTMENT_HEAD");
		expect(profileRefusal(lastHead, t, MOVE).fields).toEqual({
			departmentId: copy("people.form.lastDepartmentHead"),
		});
		expect(profileRefusal(lastHead, t, EDIT).message).toBe(
			copy("people.form.lastDepartmentHead")
		);
	});

	it("reads a 403 after a Department change as that Department being out of reach", () => {
		expect(profileRefusal(problem(403), t, MOVE).fields).toEqual({
			departmentId: copy("people.form.departmentForbidden"),
		});
	});

	it.each([
		["status", "status"],
		["departmentId", "departmentId"],
	] as const)(
		"places the API's %s rule on %s only when editing",
		(apiField, field) => {
			expect(
				profileRefusal(problem(400, undefined, [apiField]), t, EDIT).fields
			).toEqual({ [field]: copy("people.form.rejected") });
			expect(
				profileRefusal(problem(400, undefined, [apiField]), t).fields
			).toEqual({});
		}
	);
});

describe("profileActionRefusal", () => {
	it.each([
		["409 CANNOT_DEACTIVATE_SELF", "people.form.selfDeactivation"],
		[
			"409 COMPANY_OWNER_CANNOT_BE_DEACTIVATED",
			"people.form.ownerDeactivation",
		],
		["409 LAST_ACTIVE_DEPARTMENT_HEAD", "people.form.lastDepartmentHead"],
		["409 INVITATION_NOT_PENDING", "people.profile.invitationNotPending"],
		["502 INVITATION_NOT_DELIVERED", "people.form.invitationNotDelivered"],
		["404 MEMBER_PROFILE_NOT_FOUND", "people.form.profileMissing"],
		["429 RATE_LIMITED", "auth.retryHold.later"],
		["403 SOMETHING", "people.profile.actionForbidden"],
		["500 SOMETHING", "people.profile.actionFailed"],
	] as const)("answers %s with %s", (code, key) => {
		expect(profileActionRefusal(fromCode(code), t)).toBe(copy(key));
	});
});
