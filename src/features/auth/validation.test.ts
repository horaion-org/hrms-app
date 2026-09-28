import { describe, expect, it } from "vitest";
import {
	validateRegistration,
	type RegistrationField,
} from "@/features/auth/validation";

const validData = (): FormData => {
	const data = new FormData();
	const values = {
		companyName: "Acme",
		registrationNumber: "202600001A",
		firstName: "Alex",
		lastName: "Tan",
		subdomain: "acme",
		email: "alex@example.com",
		password: "Example123!",
		confirmPassword: "Example123!",
	};
	for (const [key, value] of Object.entries(values)) data.set(key, value);
	return data;
};

describe("registration validation", () => {
	it("accepts valid details and surrounding whitespace on non-password fields", () => {
		const data = validData();
		data.set("firstName", " Alex ");
		data.set("email", " alex@example.com ");
		expect(validateRegistration(data)).toEqual({});
	});
	it("reports all missing fields", () => {
		expect(Object.keys(validateRegistration(new FormData()))).toHaveLength(8);
	});
	const invalid: Array<[RegistrationField, string]> = [
		["companyName", "   "],
		["companyName", "A".repeat(256)],
		["registrationNumber", "A".repeat(65)],
		["firstName", "A".repeat(128)],
		["lastName", "A".repeat(128)],
		["subdomain", "ab"],
		["subdomain", "-company"],
		["subdomain", "company-"],
		["subdomain", "Company"],
		["subdomain", "admin"],
		["subdomain", "horaion"],
		["subdomain", "a".repeat(31)],
		["email", "not-an-email"],
		["email", "a@@example.com"],
		["password", "short"],
		["password", "A".repeat(129)],
		["password", "        "],
		["confirmPassword", "different"],
	];
	it.each(invalid)("rejects invalid %s", (field, value) => {
		const data = validData();
		data.set(field, value);
		expect(validateRegistration(data)[field]).toBeDefined();
	});
	it("accepts field length limits and a matching 128-character password", () => {
		const data = validData();
		data.set("companyName", "A".repeat(255));
		data.set("registrationNumber", "A".repeat(64));
		data.set("firstName", "A".repeat(127));
		data.set("lastName", "A".repeat(127));
		data.set("subdomain", "a".repeat(30));
		data.set("password", "Aa1!".repeat(32));
		data.set("confirmPassword", "Aa1!".repeat(32));
		expect(validateRegistration(data)).toEqual({});
	});
	it("names every password rule the password misses", () => {
		const data = validData();
		data.set("password", "lowercase");
		expect(validateRegistration(data).password).toBe(
			"Add an uppercase letter, a number and a symbol."
		);
	});
	it.each([
		["ExampleOne!", "Add a number."],
		["EXAMPLE123!", "Add a lowercase letter."],
		["Example1234", "Add a symbol."],
	])("names the one rule %s misses", (password, message) => {
		const data = validData();
		data.set("password", password);
		expect(validateRegistration(data).password).toBe(message);
	});
	it("does not trim passwords when comparing confirmation", () => {
		const data = validData();
		data.set("confirmPassword", "Example123! ");
		expect(validateRegistration(data).confirmPassword).toBeDefined();
	});
});
