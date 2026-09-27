import { createInstance, type TFunction } from "i18next";
import { describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import es from "@/assets/locales/es/translations.json";
import { ApiProblemError } from "@/common/problem";
import {
	failureMessage,
	problemMessage,
	showFailure,
} from "@/features/auth/errors";

const translator = async (lng: "en" | "es"): Promise<TFunction> => {
	const i18n = createInstance();
	await i18n.init({
		lng,
		resources: { en: { translation: en }, es: { translation: es } },
	});

	return i18n.t;
};

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

	it("shows the fallback for anything but an API refusal", () => {
		const setError = vi.fn();

		showFailure<Values>(new TypeError("Failed to fetch"), setError, options);
		showFailure<Values>("boom", setError, options);

		expect(setError.mock.calls).toEqual([
			["password", { message: "Something went wrong" }],
			["password", { message: "Something went wrong" }],
		]);
	});
});

describe("problemMessage", () => {
	it.each([
		["INVALID_CREDENTIALS", 401],
		["SESSION_EXPIRED", 401],
		["CHALLENGE_EXPIRED", 401],
		["INVALID_CODE", 401],
		["PASSWORD_POLICY_VIOLATION", 400],
		["MFA_ALREADY_ENABLED", 409],
		["RATE_LIMITED", 429],
	])("translates %s into English and Spanish", async (errorCode, status) => {
		const problem = new ApiProblemError(status, {
			detail: "API wording",
			errorCode,
		});

		const english = problemMessage(problem, await translator("en"));
		const spanish = problemMessage(problem, await translator("es"));

		expect(english).toBeDefined();
		expect(spanish).toBeDefined();
		expect(spanish).not.toBe(english);
		expect(english).not.toContain("auth.errors");
		expect(spanish).not.toContain("auth.errors");
	});

	it("says how long to wait when the API does", async () => {
		const problem = new ApiProblemError(429, { errorCode: "RATE_LIMITED" }, 1);

		expect(problemMessage(problem, await translator("es"))).toBe(
			"Demasiados intentos. Vuelve a intentarlo en 1 segundo."
		);
	});

	it("leaves unknown codes to the API's wording", async () => {
		const problem = new ApiProblemError(409, { errorCode: "SOMETHING_ELSE" });

		expect(problemMessage(problem, await translator("en"))).toBeUndefined();
	});
});

describe("failureMessage", () => {
	it("prefers a translated code, then the wording it was given, then the fallback", async () => {
		const t = await translator("es");

		expect(
			failureMessage(
				new ApiProblemError(400, {
					detail: "API wording",
					errorCode: "INVALID_CODE",
				}),
				t,
				"fallback"
			)
		).toBe("Ese código no es correcto. Revísalo y vuelve a intentarlo.");
		expect(
			failureMessage(
				new ApiProblemError(409, { detail: "API wording" }),
				t,
				"fallback"
			)
		).toBe("API wording");
		expect(failureMessage(new TypeError("Offline"), t, "fallback")).toBe(
			"fallback"
		);
		expect(failureMessage("boom", t, "fallback")).toBe("fallback");
	});
});
