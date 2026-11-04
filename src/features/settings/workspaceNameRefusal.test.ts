import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { workspaceNameRefusal } from "@/features/settings/workspaceNameRefusal";

const t = ((key: string) => key) as unknown as TFunction;

const problem = (
	status: number,
	errorCode: string,
	fieldErrors: Array<{ field: string; message: string }> = []
): ApiProblemError =>
	new ApiProblemError({
		message: "Refused",
		status,
		errorCode,
		fieldErrors,
		reason: "http",
	});

describe("workspaceNameRefusal", () => {
	it("puts the normalized-name refusal on the field", () => {
		expect(
			workspaceNameRefusal(problem(400, "INVALID_COMPANY_NAME"), t)
		).toEqual({
			workspaceName: "settings.general.validation.rejected",
			message: undefined,
		});
	});

	it("puts a Bean Validation error on name on the field", () => {
		expect(
			workspaceNameRefusal(
				problem(400, "VALIDATION_FAILED", [{ field: "name", message: "x" }]),
				t
			)
		).toEqual({
			workspaceName: "settings.general.validation.rejected",
			message: undefined,
		});
	});

	it("explains a refusal of permission as the form's alert", () => {
		expect(
			workspaceNameRefusal(problem(403, "AUTHORIZATION_DENIED"), t)
		).toEqual({
			workspaceName: undefined,
			message: "settings.general.renameForbidden",
		});
	});

	it("reads anything else, network failures included, as a failed save", () => {
		expect(workspaceNameRefusal(new Error("offline"), t)).toEqual({
			workspaceName: undefined,
			message: "settings.general.saveFailed",
		});
		expect(workspaceNameRefusal(problem(404, "COMPANY_NOT_FOUND"), t)).toEqual({
			workspaceName: undefined,
			message: "settings.general.saveFailed",
		});
	});
});
