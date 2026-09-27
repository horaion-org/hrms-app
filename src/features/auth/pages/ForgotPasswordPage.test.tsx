import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as Router from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	accessPassReply,
	problemReply,
	stubApi,
} from "@/common/testing/stubApi";
import { ForgotPasswordPage } from "@/features/auth/pages/ForgotPasswordPage";
import {
	endSession,
	hasAccessPass,
	onSessionEnded,
	signIn,
} from "@/features/auth/session";
import { renderAuthPage } from "@/features/auth/testing";
import { useToastStore } from "@/store/useToastStore";

const navigate = vi.hoisted(() => vi.fn());

vi.mock(
	"@tanstack/react-router",
	async (importOriginal): Promise<typeof Router> => ({
		...(await importOriginal<typeof Router>()),
		useNavigate: () => navigate,
	})
);

beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	vi.stubGlobal("matchMedia", () => ({ matches: true }));
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	navigate.mockReset();
	endSession("expired");
	act(() => {
		useToastStore.setState({ toasts: [] });
	});
});

const sendCodeTo = async (email: string): Promise<void> => {
	await userEvent.type(
		await screen.findByLabelText("Email address", { selector: "input" }),
		email
	);
	await userEvent.click(
		screen.getByRole("button", { name: "Send reset code" })
	);
};

const changePassword = async (
	code: string,
	password: string
): Promise<void> => {
	await userEvent.type(
		await screen.findByLabelText("Reset code", { selector: "input" }),
		code
	);
	await userEvent.type(
		screen.getByLabelText("New password", { selector: "input" }),
		password
	);
	await userEvent.click(
		screen.getByRole("button", { name: "Change password" })
	);
};

describe("ForgotPasswordPage", () => {
	it("sends a code, then resets the password with it", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			"POST /api/v1/public/password-resets": { status: 202 },
			"POST /api/v1/public/password-resets/completions": { status: 204 },
		});
		renderAuthPage(<ForgotPasswordPage />);

		await user.type(
			await screen.findByLabelText("Email address", { selector: "input" }),
			"jose@acme.test"
		);
		await user.click(screen.getByRole("button", { name: "Send reset code" }));

		await user.type(
			await screen.findByLabelText("Reset code", { selector: "input" }),
			"123456"
		);
		expect(
			screen.getByLabelText("Email address", { selector: "input" })
		).toHaveValue("jose@acme.test");
		await user.type(
			screen.getByLabelText("New password", { selector: "input" }),
			"N3w!password"
		);
		await user.click(screen.getByRole("button", { name: "Change password" }));

		await waitFor(() => {
			expect(navigate).toHaveBeenCalledWith({
				to: "/sign-in",
				search: { email: "jose@acme.test" },
			});
		});
		expect(calls.map((call) => call.body)).toEqual([
			{ email: "jose@acme.test" },
			// eslint-disable-next-line camelcase -- the API's JSON is snake_case
			{ email: "jose@acme.test", code: "123456", new_password: "N3w!password" },
		]);
	});

	it("forgets this browser's access pass once the reset ends every Session", async () => {
		stubApi({
			"POST /api/v1/public/sessions": accessPassReply(),
			"POST /api/v1/public/password-resets": { status: 202 },
			"POST /api/v1/public/password-resets/completions": { status: 204 },
		});
		await signIn("jose@acme.test", "0ld!password");
		expect(hasAccessPass()).toBe(true);
		const ended = vi.fn();
		const unsubscribe = onSessionEnded(ended);
		renderAuthPage(<ForgotPasswordPage />);

		await sendCodeTo("jose@acme.test");
		await changePassword("123456", "N3w!password");

		await waitFor(() => {
			expect(navigate).toHaveBeenCalled();
		});
		expect(hasAccessPass()).toBe(false);
		expect(ended).toHaveBeenCalledWith("signed-out");
		unsubscribe();
	});

	it("answers a registered and an unknown email the same way", async () => {
		stubApi({ "POST /api/v1/public/password-resets": { status: 202 } });
		renderAuthPage(<ForgotPasswordPage />);

		await sendCodeTo("nobody@acme.test");

		expect(
			await screen.findByLabelText("Reset code", { selector: "input" })
		).toBeInTheDocument();
		expect(useToastStore.getState().toasts).toEqual([
			expect.objectContaining({
				tone: "success",
				message: "Check your email for a reset code.",
			}),
		]);
	});

	it("shows a wrong code on the code field and stays on the page", async () => {
		stubApi({
			"POST /api/v1/public/password-resets": { status: 202 },
			"POST /api/v1/public/password-resets/completions": problemReply(
				400,
				"INVALID_CODE"
			),
		});
		renderAuthPage(<ForgotPasswordPage />);

		await sendCodeTo("jose@acme.test");
		await changePassword("000000", "N3w!password");

		expect(
			await screen.findByLabelText("Reset code", { selector: "input" })
		).toHaveAccessibleDescription(
			"That code is not right. Check it and try again."
		);
		expect(navigate).not.toHaveBeenCalled();
	});

	it("shows a password the policy refuses on the password field", async () => {
		stubApi({
			"POST /api/v1/public/password-resets": { status: 202 },
			"POST /api/v1/public/password-resets/completions": {
				status: 400,
				body: {
					status: 400,
					errorCode: "PASSWORD_POLICY_VIOLATION",
					detail: "Password must contain a symbol",
				},
			},
		});
		renderAuthPage(<ForgotPasswordPage />);

		await sendCodeTo("jose@acme.test");
		await changePassword("123456", "N3w!password");

		expect(
			await screen.findByLabelText("New password", { selector: "input" })
		).toHaveAccessibleDescription(
			expect.stringContaining(
				"Choose a stronger password: 8 to 128 characters with upper and lower case letters, a number and a symbol."
			)
		);
		expect(navigate).not.toHaveBeenCalled();
	});

	it("says how long to wait when there were too many requests", async () => {
		stubApi({
			"POST /api/v1/public/password-resets": problemReply(429, "RATE_LIMITED", {
				"Retry-After": "30",
			}),
		});
		renderAuthPage(<ForgotPasswordPage />);

		await sendCodeTo("jose@acme.test");

		expect(
			await screen.findByLabelText("Email address", { selector: "input" })
		).toHaveAccessibleDescription(
			"Too many attempts. Try again in 30 seconds."
		);
	});

	it("shows a failure to send on the email field", async () => {
		stubApi({
			"POST /api/v1/public/password-resets": {
				status: 400,
				body: { status: 400, detail: "Attempt limit exceeded" },
			},
		});
		renderAuthPage(<ForgotPasswordPage />);

		await userEvent.type(
			await screen.findByLabelText("Email address", { selector: "input" }),
			"jose@acme.test"
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Send reset code" })
		);

		expect(
			await screen.findByLabelText("Email address", { selector: "input" })
		).toHaveAccessibleDescription("Attempt limit exceeded");
		expect(screen.queryByLabelText("Reset code")).not.toBeInTheDocument();
	});
});
