import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as Router from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	envelope,
	problemReply,
	stubApi,
	type StubReply,
} from "@/common/testing/stubApi";
import { SignUpPage } from "@/features/auth/pages/SignUpPage";
import { renderAuthPage } from "@/features/auth/testing";

const navigate = vi.hoisted(() => vi.fn());

vi.mock(
	"@tanstack/react-router",
	async (importOriginal): Promise<typeof Router> => ({
		...(await importOriginal<typeof Router>()),
		useNavigate: () => navigate,
	})
);

const ONBOARDING = "POST /api/v1/public/onboardings";

/** Stubs the API with `reply` for Onboarding, returning the calls it got. */
const onboardingReplies = (reply: StubReply): ReturnType<typeof stubApi> =>
	stubApi({ [ONBOARDING]: reply });

const refusal = (
	status: number,
	errorCode: string,
	detail: string
): StubReply => ({
	status,
	body: { status, detail, errorCode },
});

beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	vi.stubGlobal("matchMedia", () => ({ matches: true }));
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	navigate.mockReset();
});

const fill = async (
	overrides: Partial<Record<string, string>> = {}
): Promise<void> => {
	const user = userEvent.setup();
	const values = {
		"Company name": "Acme",
		"Workspace address": "Acme-HQ",
		"Your name": "Jose Rizal",
		"Email address": "jose@acme.test",
		Password: "Str0ng!pass",
		...overrides,
	};
	// Typing is sequential: each field waits for the previous one.
	await Object.entries(values).reduce(async (previous, [label, value]) => {
		await previous;
		if (value !== "") {
			await user.type(
				await screen.findByLabelText(label, { selector: "input" }),
				value
			);
		}
	}, Promise.resolve());
	await user.click(screen.getByRole("button", { name: "Create company" }));
};

describe("SignUpPage", () => {
	it("creates the company and asks for the confirmation code", async () => {
		const calls = onboardingReplies({
			status: 201,
			/* eslint-disable-next-line camelcase -- the API's JSON is snake_case */
			body: envelope({ company_id: "c-1" }),
		});
		renderAuthPage(<SignUpPage />);

		await fill();

		await waitFor(() => {
			expect(navigate).toHaveBeenCalledWith({
				to: "/confirm-email",
				search: { email: "jose@acme.test" },
			});
		});
		/* eslint-disable camelcase -- the API's JSON is snake_case */
		expect(calls[0]?.body).toEqual({
			company_name: "Acme",
			subdomain: "acme-hq",
			display_name: "Jose Rizal",
			email: "jose@acme.test",
			password: "Str0ng!pass",
		});
		/* eslint-enable camelcase */
	});

	it("requires the owner's name, which the API needs", async () => {
		const calls = stubApi({});
		renderAuthPage(<SignUpPage />);

		await fill({ "Your name": "" });

		expect(
			await screen.findByLabelText("Your name", { selector: "input" })
		).toHaveAccessibleDescription("This field is required");
		expect(calls).toHaveLength(0);
	});

	it.each([
		["ab", "Use 3–30 lowercase letters"],
		["-acme", "Use 3–30 lowercase letters"],
		["admin", "This address is reserved. Choose another"],
	])("rejects the workspace address %s", async (subdomain, message) => {
		const calls = stubApi({});
		renderAuthPage(<SignUpPage />);

		await fill({ "Workspace address": subdomain });

		expect(
			await screen.findByLabelText("Workspace address", { selector: "input" })
		).toHaveAccessibleDescription(expect.stringContaining(message));
		expect(calls).toHaveLength(0);
	});

	it("rejects a password the pool would refuse", async () => {
		const calls = stubApi({});
		renderAuthPage(<SignUpPage />);

		await fill({ Password: "alllowercase1" });

		expect(
			await screen.findByLabelText("Password", { selector: "input" })
		).toHaveAccessibleDescription(
			"Include an uppercase letter, a lowercase letter, a number and a symbol"
		);
		expect(calls).toHaveLength(0);
	});

	it("shows a taken workspace address on its field", async () => {
		onboardingReplies(
			refusal(
				409,
				"SUBDOMAIN_ALREADY_TAKEN",
				"Subdomain 'acme-hq' is already claimed by another company"
			)
		);
		renderAuthPage(<SignUpPage />);

		await fill();

		expect(
			await screen.findByLabelText("Workspace address", { selector: "input" })
		).toHaveAccessibleDescription(
			"Subdomain 'acme-hq' is already claimed by another company"
		);
		expect(navigate).not.toHaveBeenCalled();
	});

	it.each([
		[
			"PASSWORD_POLICY_VIOLATION",
			"Password",
			"Choose a stronger password: 8 to 128 characters with upper and lower case letters, a number and a symbol.",
		],
		["IDENTITY_REJECTED", "Email address", "Refused by the pool"],
	])("shows the pool's %s refusal on %s", async (errorCode, label, message) => {
		onboardingReplies(refusal(400, errorCode, "Refused by the pool"));
		renderAuthPage(<SignUpPage />);

		await fill();

		expect(
			await screen.findByLabelText(label, { selector: "input" })
		).toHaveAccessibleDescription(message);
	});

	it("shows the API's field errors on their fields", async () => {
		onboardingReplies({
			status: 400,
			body: {
				status: 400,
				detail: "Validation failed",
				errors: [{ field: "display_name", message: "must not be blank" }],
			},
		});
		renderAuthPage(<SignUpPage />);

		await fill();

		expect(
			await screen.findByLabelText("Your name", { selector: "input" })
		).toHaveAccessibleDescription("must not be blank");
	});

	it("says how long to wait after too many attempts", async () => {
		onboardingReplies(
			problemReply(429, "RATE_LIMITED", { "Retry-After": "1" })
		);
		renderAuthPage(<SignUpPage />);

		await fill();

		expect(
			await screen.findByLabelText("Password", { selector: "input" })
		).toHaveAccessibleDescription(
			expect.stringContaining("Too many attempts. Try again in 1 second.")
		);
		expect(navigate).not.toHaveBeenCalled();
	});
});
