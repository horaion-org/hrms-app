import { describe, expect, it } from "vitest";
import { emailFromHistory, withEmail } from "@/features/auth/historyState";

describe("emailFromHistory", () => {
	it("reads an email passed by another screen", () => {
		expect(emailFromHistory({ email: "alex@example.com", key: "k1" })).toBe(
			"alex@example.com"
		);
	});

	it.each([
		undefined,
		null,
		{},
		{ email: "" },
		{ email: 42 },
		"alex@example.com",
	])("reads %s as no email", (state) => {
		expect(emailFromHistory(state)).toBeUndefined();
	});
});

describe("withEmail", () => {
	it("adds the email to the next entry's state and keeps the rest", () => {
		expect(withEmail("alex@example.com")({ __tempKey: "k1" })).toEqual({
			__tempKey: "k1",
			email: "alex@example.com",
		});
	});

	it("round-trips through emailFromHistory", () => {
		expect(emailFromHistory(withEmail("alex@example.com")({}))).toBe(
			"alex@example.com"
		);
	});
});
