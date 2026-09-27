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
import { NewPasswordPage } from "@/features/auth/pages/NewPasswordPage";
import { endSession, hasAccessPass, signIn } from "@/features/auth/session";
import { renderAuthPage } from "@/features/auth/testing";

const navigate = vi.hoisted(() => vi.fn());

vi.mock(
	"@tanstack/react-router",
	async (importOriginal): Promise<typeof Router> => ({
		...(await importOriginal<typeof Router>()),
		useNavigate: () => navigate,
	})
);

const SESSIONS = "/api/v1/public/sessions";

/** Signs in with a temporary password so the new-password Challenge is pending. */
const meetChallenge = async (answer: StubReply): Promise<void> => {
	stubApi({
		[`POST ${SESSIONS}`]: {
			status: 200,
			body: envelope({ challenge: "NEW_PASSWORD_REQUIRED" }),
		},
		[`POST ${SESSIONS}/challenge`]: answer,
	});
	await signIn("jose@acme.test", "Temp0rary!");
};

const choosePassword = async (): Promise<void> => {
	await userEvent.type(
		await screen.findByLabelText("New password", { selector: "input" }),
		"N3w!password"
	);
	await userEvent.click(
		screen.getByRole("button", { name: "Set password and continue" })
	);
};

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

describe("NewPasswordPage", () => {
	it("answers the Challenge and continues to the page asked for", async () => {
		await meetChallenge(accessPassReply());
		renderAuthPage(<NewPasswordPage />, "/new-password?redirect=%2Fexample");

		await choosePassword();

		await waitFor(() => {
			expect(navigate).toHaveBeenCalledWith({ href: "/example" });
		});
		expect(hasAccessPass()).toBe(true);
	});

	it("asks for the authenticator code when MFA is also on", async () => {
		await meetChallenge({
			status: 200,
			body: envelope({ challenge: "SOFTWARE_TOKEN_MFA" }),
		});
		renderAuthPage(<NewPasswordPage />, "/new-password?redirect=%2Fexample");

		await choosePassword();

		await waitFor(() => {
			expect(navigate).toHaveBeenCalledWith({
				to: "/mfa",
				search: { redirect: "/example" },
			});
		});
		expect(hasAccessPass()).toBe(false);
	});

	it.each<[string, StubReply, string]>([
		[
			"an expired Challenge",
			problemReply(401, "CHALLENGE_EXPIRED"),
			"This login took too long. Log in again.",
		],
		[
			"a refused password",
			{
				status: 400,
				body: { status: 400, detail: "Password does not conform to policy" },
			},
			"Password does not conform to policy",
		],
	])("explains %s on the field", async (_case, reply, message) => {
		await meetChallenge(reply);
		renderAuthPage(<NewPasswordPage />);

		await choosePassword();

		await waitFor(async () => {
			expect(
				await screen.findByLabelText("New password", { selector: "input" })
			).toHaveAccessibleDescription(message);
		});
		expect(navigate).not.toHaveBeenCalled();
	});

	it("sends a person without a Challenge back to sign in", async () => {
		renderAuthPage(<NewPasswordPage />);

		expect(
			await screen.findByRole("heading", { name: "Nothing to set" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Back to log in" })
		).toHaveAttribute("href", "/sign-in");
		expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
	});
});
