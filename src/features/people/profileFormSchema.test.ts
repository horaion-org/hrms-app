import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import {
	EMPTY_PROFILE,
	profileFormSchema,
	type ProfileFormValues,
} from "@/features/people/profileFormSchema";

// Each message is its own key, so a test reads which rule refused.
const t = ((key: string) => key.replace("people.form.", "")) as TFunction;
const schema = profileFormSchema(t, "2026-10-06");
const valid: ProfileFormValues = {
	...EMPTY_PROFILE,
	displayName: "Priya Nair",
	email: "priya@company.com",
	departmentId: "d-1",
};
/** Each refused field and its message. */
const refusals = (
	changes: Partial<ProfileFormValues>
): Record<string, string> =>
	Object.fromEntries(
		(schema.safeParse({ ...valid, ...changes }).error?.issues ?? []).map(
			(issue) => [issue.path.join("."), issue.message]
		)
	);

describe("profile form rules", () => {
	it("needs only a name, an email address and a department", () => {
		expect(schema.safeParse(valid).success).toBe(true);
		expect(
			refusals({ displayName: "  ", email: "", departmentId: "" })
		).toEqual({
			displayName: "fullNameRequired",
			email: "emailRequired",
			departmentId: "departmentRequired",
		});
	});

	it("trims the name and email address", () => {
		expect(
			schema.parse({
				...valid,
				displayName: "  Priya Nair ",
				email: " priya@company.com ",
			})
		).toMatchObject({ displayName: "Priya Nair", email: "priya@company.com" });
	});

	it.each([
		[{ displayName: "x".repeat(256) }, { displayName: "fullNameLength" }],
		[{ email: "priya" }, { email: "emailInvalid" }],
		[{ email: `${"x".repeat(310)}@company.com` }, { email: "emailLength" }],
	])("refuses %j", (changes, expected) => {
		expect(refusals(changes)).toEqual(expected);
	});

	it("accepts a date of birth only in the past", () => {
		expect(refusals({ dateOfBirth: "2026-10-05" })).toEqual({});
		expect(refusals({ dateOfBirth: "2026-10-06" })).toEqual({
			dateOfBirth: "dateOfBirthPast",
		});
	});

	it.each([
		["", {}],
		["+6581234567", {}],
		["81234567", { phone: "phoneCountry" }],
		["+65123", { phone: "phoneInvalid" }],
		["+0123456789", { phone: "phoneInvalid" }],
		[`+65${"1".repeat(14)}`, { phone: "phoneInvalid" }],
	])("reads the phone %j", (phone, expected) => {
		expect(refusals({ phone })).toEqual(expected);
	});

	it("needs the probation to end on or after the hire date", () => {
		expect(
			refusals({ hireDate: "2026-10-01", probationEndDate: "2026-10-01" })
		).toEqual({});
		expect(refusals({ probationEndDate: "2026-01-01" })).toEqual({});
		expect(
			refusals({ hireDate: "2026-10-01", probationEndDate: "2026-09-30" })
		).toEqual({ probationEndDate: "probationBeforeHire" });
	});

	it("checks the probation even while another field is wrong", () => {
		expect(
			refusals({
				displayName: "",
				hireDate: "2026-10-01",
				probationEndDate: "2026-09-30",
			})
		).toEqual({
			displayName: "fullNameRequired",
			probationEndDate: "probationBeforeHire",
		});
	});
});
