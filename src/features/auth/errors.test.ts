import { describe, expect, it, vi } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { showFailure } from "@/features/auth/errors";

type Values = { email: string; displayName: string; password: string };

const options = {
	fields: ["email", "displayName", "password"] as const,
	fallbackField: "password" as const,
	fallbackMessage: "Something went wrong",
	errorCodeFields: { EMAIL_ALREADY_REGISTERED: "email" as const },
};

describe("showFailure", () => {
	it("puts the API's per-field errors on their camelCase fields", () => {
		const setError = vi.fn();
		const problem = new ApiProblemError(400, {
			detail: "Validation failed",
			errors: [
				{ field: "display_name", message: "must not be blank" },
				{ field: "displayName", message: "size must be at most 255" },
				{ field: "unknown", message: "ignored" },
			],
		});

		showFailure<Values>(problem, setError, options);

		expect(setError.mock.calls).toEqual([
			["displayName", { message: "must not be blank" }],
			["displayName", { message: "size must be at most 255" }],
		]);
	});

	it("puts a known error code on the field it concerns", () => {
		const setError = vi.fn();
		const problem = new ApiProblemError(409, {
			detail: "That email address is already registered; sign in instead",
			errorCode: "EMAIL_ALREADY_REGISTERED",
		});

		showFailure<Values>(problem, setError, options);

		expect(setError).toHaveBeenCalledWith("email", {
			message: "That email address is already registered; sign in instead",
		});
	});

	it("puts any other API problem on the fallback field", () => {
		const setError = vi.fn();
		const problem = new ApiProblemError(429, {
			detail: "Too many requests",
			errorCode: "RATE_LIMITED",
		});

		showFailure<Values>(problem, setError, options);

		expect(setError).toHaveBeenCalledWith("password", {
			message: "Too many requests",
		});
	});

	it("shows an Error's message, or the fallback for anything else", () => {
		const setError = vi.fn();

		showFailure<Values>(
			new Error("Incorrect username or password."),
			setError,
			options
		);
		showFailure<Values>("boom", setError, options);

		expect(setError.mock.calls).toEqual([
			["password", { message: "Incorrect username or password." }],
			["password", { message: "Something went wrong" }],
		]);
	});
});
