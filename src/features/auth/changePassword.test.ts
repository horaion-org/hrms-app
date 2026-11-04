import { describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { changePasswordSchema } from "@/features/auth/changePassword";
import { authTestI18n } from "@/features/auth/testingI18n";

const copy = en.auth.changePassword;
const CURRENT = "Current123!";
const NEW = "Example123!";

const errorsFor = (
	values: Partial<Record<string, string>>
): Record<string, string | undefined> => {
	const result = changePasswordSchema(authTestI18n.t).safeParse({
		currentPassword: CURRENT,
		newPassword: NEW,
		confirmPassword: NEW,
		...values,
	});
	if (result.success) return {};
	return Object.fromEntries(
		result.error.issues.map((issue) => [String(issue.path[0]), issue.message])
	);
};

describe("change password schema", () => {
	it("accepts a valid change", () => {
		expect(errorsFor({})).toEqual({});
	});

	it("requires the current password", () => {
		expect(errorsFor({ currentPassword: "" })).toEqual({
			currentPassword: copy.currentRequired,
		});
	});

	it.each([
		"Short1!",
		"example123!",
		"EXAMPLE123!",
		"Example!!!",
		"Example123",
	])("refuses a new password outside the pool policy: %s", (newPassword) => {
		expect(errorsFor({ newPassword, confirmPassword: newPassword })).toEqual({
			newPassword: copy.passwordPolicy,
		});
	});

	it("refuses a new password equal to the current one", () => {
		expect(
			errorsFor({ newPassword: CURRENT, confirmPassword: CURRENT })
		).toEqual({ newPassword: copy.unchanged });
	});

	it("requires the confirmation to match", () => {
		expect(errorsFor({ confirmPassword: "Example123?" })).toEqual({
			confirmPassword: copy.passwordMismatch,
		});
	});
});
