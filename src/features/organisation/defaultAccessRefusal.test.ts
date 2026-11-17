import { describe, expect, it } from "vitest";
import { ApiProblemError, UnreachableError } from "@/common/problem";
import { authTestI18n } from "@/features/auth/testingI18n";
import { defaultAccessRefusal } from "@/features/organisation/defaultAccessRefusal";

const t = authTestI18n.t.bind(authTestI18n);
const problem = (status: number, errorCode: string): ApiProblemError =>
	new ApiProblemError({
		status,
		errorCode,
		fieldErrors: [],
		reason: "http",
		message: "Private server wording",
	});

describe("default access refusal mapping", () => {
	it.each([
		[
			400,
			"INVALID_DEFAULT_ACCESS_RULE",
			"Choose a custom role of this company",
		],
		[409, "ACCESS_ROLE_INACTIVE", "Switch it on, or choose another role."],
		[
			400,
			"ACCESS_ROLE_KIND_CONFLICT",
			"Choose a role for branches and departments.",
		],
		[400, "ACCESS_ROLE_SCOPE_INCOMPATIBLE", "Remove them from the role"],
		[409, "DEFAULT_ACCESS_RULE_CONFLICT", "Remove it first"],
		[404, "BRANCH_NOT_FOUND", "Choose another place."],
		[404, "DEPARTMENT_NOT_FOUND", "Choose another place."],
		[400, "INVALID_DEFAULT_ACCESS_RECIPIENT", "Untick them and try again."],
	])("says what to do for %i %s", (status, code, words) => {
		const message = defaultAccessRefusal(problem(status, code), t);

		expect(message).toContain(words);
		expect(message).not.toContain("Private server wording");
	});

	it("says who may change default access on a 403", () => {
		expect(defaultAccessRefusal(problem(403, "AUTHORIZATION_DENIED"), t)).toBe(
			"Only the System Owner or a System Admin can change default access."
		);
	});

	it("asks to try again on anything else", () => {
		expect(defaultAccessRefusal(new UnreachableError("offline"), t)).toBe(
			"Default access couldn’t be changed. Try again."
		);
	});
});
