import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as Router from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	accessPassReply,
	envelope,
	problemReply,
	stubApi,
	type StubReply,
} from "@/common/testing/stubApi";
import { endSession, hasAccessPass } from "@/features/auth/session";
import { SignInPage } from "@/features/auth/pages/SignInPage";
import { renderAuthPage } from "@/features/auth/testing";

const navigate = vi.hoisted(() => vi.fn());

vi.mock(
	"@tanstack/react-router",
	async (importOriginal): Promise<typeof Router> => ({
		...(await importOriginal<typeof Router>()),
		useNavigate: () => navigate,
	})
);

const SIGN_IN = "POST /api/v1/public/sessions";

beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	vi.stubGlobal("matchMedia", () => ({ matches: true }));
});

afterEach(() => {
	endSession("expired");
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	navigate.mockReset();
});

const submit = async (): Promise<void> => {
	const user = userEvent.setup();
	await user.type(
		await screen.findByLabelText("Email", { selector: "input" }),
		"jose@acme.test"
	);
	await user.type(
		screen.getByLabelText("Password", { selector: "input" }),
		"Str0ng!pass"
	);
	await user.click(screen.getByRole("button", { name: "Log in" }));
};

const passwordField = (): Promise<HTMLElement> =>
	screen.findByLabelText("Password", { selector: "input" });

describe("SignInPage", () => {
	it.each([
		["/sign-in", "/"],
		["/sign-in?redirect=%2Fexample%3Ftab%3D2", "/example?tab=2"],
		["/sign-in?redirect=%2F%2Fevil.test", "/"],
		["/sign-in?redirect=https%3A%2F%2Fevil.test", "/"],
	])("signs in from %s and opens %s", async (entry, destination) => {
		const calls = stubApi({ [SIGN_IN]: accessPassReply() });
		renderAuthPage(<SignInPage />, entry);

		await submit();

		await waitFor(() => {
			expect(navigate).toHaveBeenCalledWith({ href: destination });
		});
		expect(calls[0]?.body).toEqual({
			email: "jose@acme.test",
			password: "Str0ng!pass",
		});
		expect(hasAccessPass()).toBe(true);
	});

	it("sends a person with a temporary password to choose their own", async () => {
		stubApi({
			[SIGN_IN]: {
				status: 200,
				body: envelope({ challenge: "NEW_PASSWORD_REQUIRED" }),
			},
		});
		renderAuthPage(<SignInPage />, "/sign-in?redirect=%2Fexample");

		await submit();

		await waitFor(() => {
			expect(navigate).toHaveBeenCalledWith({
				to: "/new-password",
				search: { redirect: "/example" },
			});
		});
	});

	it("asks a person with MFA on for their authenticator code", async () => {
		stubApi({
			[SIGN_IN]: {
				status: 200,
				body: envelope({ challenge: "SOFTWARE_TOKEN_MFA" }),
			},
		});
		renderAuthPage(<SignInPage />, "/sign-in?redirect=%2Fexample");

		await submit();

		await waitFor(() => {
			expect(navigate).toHaveBeenCalledWith({
				to: "/mfa",
				search: { redirect: "/example" },
			});
		});
		expect(hasAccessPass()).toBe(false);
	});

	it("sends an unconfirmed person to email confirmation", async () => {
		stubApi({ [SIGN_IN]: problemReply(403, "EMAIL_NOT_VERIFIED") });
		renderAuthPage(<SignInPage />);

		await submit();

		await waitFor(() => {
			expect(navigate).toHaveBeenCalledWith({
				to: "/confirm-email",
				search: { email: "jose@acme.test" },
			});
		});
	});

	it.each<[string, StubReply, string]>([
		[
			"wrong credentials",
			problemReply(401, "INVALID_CREDENTIALS"),
			"Your email or password is incorrect.",
		],
		[
			"too many attempts",
			problemReply(429, "RATE_LIMITED", { "Retry-After": "30" }),
			"Too many attempts. Try again in 30 seconds.",
		],
		[
			"too many attempts without a wait",
			problemReply(429, "RATE_LIMITED"),
			"Too many attempts. Wait a moment and try again.",
		],
		[
			"an unmapped refusal",
			problemReply(500, "INTERNAL_ERROR"),
			"API says INTERNAL_ERROR",
		],
	])("explains %s on the password field", async (_case, reply, message) => {
		stubApi({ [SIGN_IN]: reply });
		renderAuthPage(<SignInPage />);

		await submit();

		await waitFor(async () => {
			expect(await passwordField()).toHaveAccessibleDescription(message);
		});
		expect(navigate).not.toHaveBeenCalled();
		expect(hasAccessPass()).toBe(false);
	});

	it("prefills the email from the address", async () => {
		renderAuthPage(<SignInPage />, "/sign-in?email=jose%40acme.test");

		expect(
			await screen.findByLabelText("Email", { selector: "input" })
		).toHaveValue("jose@acme.test");
	});

	it("validates before calling the API", async () => {
		const calls = stubApi({});
		renderAuthPage(<SignInPage />);

		await userEvent.click(
			await screen.findByRole("button", { name: "Log in" })
		);

		expect(
			screen.getByLabelText("Email", { selector: "input" })
		).toHaveAccessibleDescription("This field is required");
		expect(calls).toHaveLength(0);
	});

	it("offers no Remember me option", async () => {
		renderAuthPage(<SignInPage />);

		await screen.findByRole("button", { name: "Log in" });

		expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
	});

	it("links to sign-up and password help", async () => {
		renderAuthPage(<SignInPage />);

		expect(
			await screen.findByRole("link", { name: "Sign up" })
		).toHaveAttribute("href", "/sign-up");
		expect(
			screen.getByRole("link", { name: "Having trouble logging in?" })
		).toHaveAttribute("href", "/forgot-password");
	});
});
