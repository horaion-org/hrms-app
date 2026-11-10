import { describe, expect, it } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { refusalFor } from "@/features/accessRoles/CreateAccessRoleDialog/refusalFor";
import { authTestI18n } from "@/features/auth/testingI18n";

const t = authTestI18n.t.bind(authTestI18n);
const ROLE = { name: "R", kind: "LOCAL" } as const;
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

describe("create access role refusals", () => {
	it("shows a drifted catalogue as a form alert, not on a field", () => {
		expect(
			refusalFor(problem(400, "INVALID_ACCESS_ROLE_PERMISSIONS"), ROLE, t)
		).toEqual({
			fields: {},
			message:
				"Some permissions are no longer available. Reload the page and try again.",
			refreshMembers: false,
		});
	});
	it("explains the subset rule on a 403", () => {
		expect(
			refusalFor(problem(403, "AUTHORIZATION_DENIED"), ROLE, t).message
		).toContain("no longer hold some of the chosen permissions");
	});
	it("puts a kind conflict on the Role type field", () => {
		expect(
			refusalFor(problem(400, "ACCESS_ROLE_KIND_CONFLICT"), ROLE, t)
		).toEqual({
			fields: {
				kind: "A role for chosen places can’t hold company-wide permissions. Choose “Across the whole company”, or remove those permissions.",
			},
			refreshMembers: false,
		});
	});
});
