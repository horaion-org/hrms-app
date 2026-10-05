import { describe, expect, it } from "vitest";
import { ApiProblemError, UnreachableError } from "@/common/problem";
import { authTestI18n } from "@/features/auth/testingI18n";
import { accessRoleRefusal } from "@/features/organisation/accessRoleRefusal";

const t = authTestI18n.t.bind(authTestI18n);
const problem = (
	status: number,
	errorCode: string,
	fieldErrors: Array<{ field: string; message: string }> = []
): ApiProblemError =>
	new ApiProblemError({
		status,
		errorCode,
		fieldErrors,
		reason: "http",
		message: "Private server wording",
	});

describe("access role refusal mapping", () => {
	it("quotes the submitted name for the name conflict code", () => {
		expect(
			accessRoleRefusal(problem(409, "ACCESS_ROLE_NAME_CONFLICT"), "Manager", t)
		).toEqual({
			name: 'A role named "Manager" already exists. Choose a different name.',
		});
	});

	it("puts a rejected name on the name field", () => {
		expect(
			accessRoleRefusal(
				problem(400, "VALIDATION_ERROR", [
					{ field: "name", message: "Private server wording" },
				]),
				"Manager",
				t
			)
		).toEqual({ name: "Check the role name and try again." });
	});

	it.each([
		[409, "PROTECTED_ACCESS_ROLE", "The Company Owner role can’t be changed."],
		[404, "ACCESS_ROLE_NOT_FOUND", "This role no longer exists."],
		[
			403,
			"AUTHORIZATION_DENIED",
			"This role includes permissions you don’t hold, or you can no longer change system roles.",
		],
		[409, "SOMETHING_ELSE", "We couldn’t save the role. Try again."],
		[400, "VALIDATION_ERROR", "We couldn’t save the role. Try again."],
		[500, "INTERNAL_ERROR", "We couldn’t save the role. Try again."],
	])(
		"maps %s %s to frontend copy for the whole form",
		(status, code, message) => {
			expect(accessRoleRefusal(problem(status, code), "Manager", t)).toEqual({
				message,
			});
		}
	);

	it("falls back to the generic failure when the API can't be reached", () => {
		expect(
			accessRoleRefusal(new UnreachableError("offline"), "Manager", t)
		).toEqual({ message: "We couldn’t save the role. Try again." });
	});
});
