import { describe, expect, it } from "vitest";
import { ApiProblemError, UnreachableError } from "@/common/problem";
import { authTestI18n } from "@/features/auth/testingI18n";
import { refusalFor } from "@/features/organisation/CreateBranchDialog/refusalFor";

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

describe("create branch refusal mapping", () => {
	it("quotes the submitted name for the exact conflict code and status", () => {
		expect(
			refusalFor(
				problem(409, "BRANCH_NAME_CONFLICT"),
				{ name: "Orchard", code: "ORC" },
				t
			)
		).toEqual({
			fields: {
				name: 'A branch named "Orchard" already exists. Choose a different name.',
			},
			refreshMembers: false,
		});
	});
	it.each([
		[
			409,
			"BRANCH_CODE_CONFLICT",
			[],
			'A branch with code "ORC" already exists. Choose a different code.',
		],
		[
			400,
			"VALIDATION_ERROR",
			[{ field: "code", message: "Private server wording" }],
			"Check the branch code and try again.",
		],
	])(
		"maps code refusal %s to frontend copy",
		(status, errorCode, fields, message) => {
			expect(
				refusalFor(
					problem(status, errorCode, fields),
					{ name: "Orchard", code: "ORC" },
					t
				)
			).toEqual({
				fields: { code: message },
				refreshMembers: false,
			});
		}
	);

	it("marks stale heads and asks for fresh options", () => {
		expect(
			refusalFor(
				problem(400, "INVALID_INITIAL_BRANCH_HEAD"),
				{ name: "Orchard", code: "ORC" },
				t
			)
		).toEqual({
			fields: {
				heads:
					"One of the chosen people is no longer an active member. Remove them and try again.",
			},
			refreshMembers: true,
		});
	});
	it("maps only recognized field names and never copies server prose", () => {
		const result = refusalFor(
			problem(400, "VALIDATION_ERROR", [
				{ field: "name", message: "Secret server text" },
				{
					field: "initialHeadCompanyMembershipIds",
					message: "Secret server text",
				},
			]),
			{ name: "Orchard", code: "ORC" },
			t
		);
		expect(result.fields.name).toBe("Check the branch name and try again.");
		expect(result.fields.heads).toBe("Check the chosen people and try again.");
		expect(JSON.stringify(result)).not.toContain("Secret");
	});
	it.each([403, 409, 500])(
		"keeps non-field status %s at form level",
		(status) => {
			const result = refusalFor(
				problem(status, "UNKNOWN"),
				{ name: "Orchard", code: "ORC" },
				t
			);
			expect(result.fields).toEqual({});
			expect(result.message).toBe(
				status === 403
					? "You no longer have permission to create branches."
					: "We couldn’t create the branch. Try again."
			);
		}
	);
	it("uses the generic form refusal for network failure and mismatched code/status", () => {
		expect(
			refusalFor(new UnreachableError(), { name: "Orchard", code: "ORC" }, t)
				.message
		).toBe("We couldn’t create the branch. Try again.");
		expect(
			refusalFor(
				problem(500, "BRANCH_NAME_CONFLICT"),
				{ name: "Orchard", code: "ORC" },
				t
			).fields
		).toEqual({});
	});
});
