import { describe, expect, it } from "vitest";
import {
	emailConfirmationReasonFromHistory,
	emailFromHistory,
	withEmail,
	withEmailConfirmation,
} from "@/features/auth/historyState";

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

describe("withEmailConfirmation", () => {
	it.each(["code-sent", "log-in-required"] as const)(
		"carries the email and the reason %s, keeping the rest",
		(reason) => {
			const state = withEmailConfirmation(
				"alex@example.com",
				reason
			)({
				__tempKey: "k1",
			});
			expect(state).toEqual({
				__tempKey: "k1",
				email: "alex@example.com",
				emailConfirmationReason: reason,
			});
			expect(emailFromHistory(state)).toBe("alex@example.com");
			expect(emailConfirmationReasonFromHistory(state)).toBe(reason);
		}
	);
});

describe("emailConfirmationReasonFromHistory", () => {
	it.each([
		undefined,
		null,
		{},
		{ email: "alex@example.com" },
		{ emailConfirmationReason: "other" },
		{ emailConfirmationReason: 1 },
		"code-sent",
	])("reads %s as no reason", (state) => {
		expect(emailConfirmationReasonFromHistory(state)).toBeUndefined();
	});
});
