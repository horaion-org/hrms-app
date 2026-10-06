import { describe, expect, it } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { authTestI18n } from "@/features/auth/testingI18n";
import { refusalFor as departmentRefusal } from "@/features/organisation/CreateDepartmentDialog/refusalFor";
import { refusalFor as jobTitleRefusal } from "@/features/organisation/CreateJobTitleDialog/refusalFor";
import { refusalFor as systemRoleRefusal } from "@/features/organisation/CreateSystemRoleDialog/refusalFor";

const t = authTestI18n.t.bind(authTestI18n);
const problem = (
	status: number,
	errorCode?: string,
	fieldErrors: Array<{ field: string; message: string }> = []
): ApiProblemError =>
	new ApiProblemError({
		status,
		errorCode,
		fieldErrors,
		reason: "http",
		message: "Private server wording",
	});

describe("create department refusals", () => {
	it("quotes the trimmed name on a conflict", () => {
		expect(
			departmentRefusal(problem(409, "DEPARTMENT_NAME_CONFLICT"), " Bar ", t)
				.fields
		).toEqual({
			name: 'A department named "Bar" already exists in this branch. Choose a different name.',
		});
	});
	it("maps a Bean Validation 400 by field, with no error code", () => {
		expect(
			departmentRefusal(
				problem(400, undefined, [
					{ field: "initialHeadCompanyMembershipIds", message: "Secret" },
				]),
				"Bar",
				t
			).fields
		).toEqual({ heads: "Check the chosen people and try again." });
	});
	it("asks for fresh people when a head is stale", () => {
		expect(
			departmentRefusal(
				problem(400, "INVALID_INITIAL_DEPARTMENT_HEAD"),
				"Bar",
				t
			).refreshMembers
		).toBe(true);
	});
});

describe("create job title refusals", () => {
	it.each([
		[
			problem(409, "JOB_TITLE_NAME_CONFLICT"),
			'A job title named "Chef" already exists. Choose a different name.',
		],
		[
			problem(400, "INVALID_JOB_TITLE_NAME", [{ field: "name", message: "x" }]),
			"Check the job title name and try again.",
		],
	])("places %s on the name", (error, message) => {
		expect(jobTitleRefusal(error, "Chef", false, t)).toEqual({
			fields: { name: message },
			refreshMembers: false,
		});
	});
	it.each([
		[
			problem(409, "DEPARTMENT_INACTIVE"),
			"This department is inactive. Activate it first, or choose another department.",
		],
		[
			problem(404, "DEPARTMENT_NOT_FOUND"),
			"This department is no longer available. Choose another department.",
		],
	])("places %s on the department", (error, message) => {
		expect(jobTitleRefusal(error, "Chef", false, t)).toEqual({
			fields: { departmentId: message },
			refreshMembers: false,
		});
	});
	it("words a forbidden or failed edit as an edit", () => {
		expect(
			jobTitleRefusal(problem(403, "AUTHORIZATION_DENIED"), "Chef", true, t)
				.message
		).toBe("You no longer have permission to change this job title.");
		expect(jobTitleRefusal(new Error("offline"), "Chef", true, t).message).toBe(
			"We couldn’t save the job title. Try again."
		);
	});
});

describe("create system role refusals", () => {
	it("shows a drifted catalogue as a form alert, not on a field", () => {
		expect(
			systemRoleRefusal(problem(400, "INVALID_ACCESS_ROLE_PERMISSIONS"), "R", t)
		).toEqual({
			fields: {},
			message:
				"Some permissions are no longer available. Reload the page and try again.",
			refreshMembers: false,
		});
	});
	it("explains the subset rule on a 403", () => {
		expect(
			systemRoleRefusal(problem(403, "AUTHORIZATION_DENIED"), "R", t).message
		).toContain("no longer hold some of the chosen permissions");
	});
});
