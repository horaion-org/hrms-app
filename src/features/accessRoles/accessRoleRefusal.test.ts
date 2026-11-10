import { describe, expect, it } from "vitest";
import { ApiProblemError, UnreachableError } from "@/common/problem";
import { authTestI18n } from "@/features/auth/testingI18n";
import { accessRoleRefusal } from "@/features/accessRoles/accessRoleRefusal";

const t = authTestI18n.t.bind(authTestI18n);
const MANAGER = { name: "Manager", kind: "LOCAL" } as const;
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
			accessRoleRefusal(problem(409, "ACCESS_ROLE_NAME_CONFLICT"), MANAGER, t)
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
				MANAGER,
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
			"This role includes permissions you don’t hold, or you can no longer change access roles.",
		],
		[409, "SOMETHING_ELSE", "We couldn’t save the role. Try again."],
		[400, "VALIDATION_ERROR", "We couldn’t save the role. Try again."],
		[500, "INTERNAL_ERROR", "We couldn’t save the role. Try again."],
	])(
		"maps %s %s to frontend copy for the whole form",
		(status, code, message) => {
			expect(accessRoleRefusal(problem(status, code), MANAGER, t)).toEqual({
				message,
			});
		}
	);

	it.each([
		[
			"LOCAL" as const,
			"A role for chosen places can’t hold company-wide permissions. Choose “Across the whole company”, or remove those permissions.",
		],
		[
			"COMPANY" as const,
			"This role is given at branches or departments, so it can’t become a whole-company role. Remove those assignments first, or keep it for chosen places.",
		],
	])(
		"puts a kind conflict on the Role type field, worded for the %s kind sent",
		(kind, message) => {
			expect(
				accessRoleRefusal(
					problem(400, "ACCESS_ROLE_KIND_CONFLICT"),
					{ ...MANAGER, kind },
					t
				)
			).toEqual({ kind: message });
		}
	);

	it("falls back to the generic failure when the API can't be reached", () => {
		expect(
			accessRoleRefusal(new UnreachableError("offline"), MANAGER, t)
		).toEqual({ message: "We couldn’t save the role. Try again." });
	});
});
