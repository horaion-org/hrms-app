import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as Router from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	accessPassReply,
	envelope,
	problemReply,
	stubApi,
	type StubCall,
	type StubReply,
} from "@/common/testing/stubApi";
import { MfaChallengePage } from "@/features/auth/pages/MfaChallengePage";
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

/** Signs in with a password so the MFA Challenge is pending. */
const meetChallenge = async (
	answer: StubReply | Array<StubReply>
): Promise<Array<StubCall>> => {
	const calls = stubApi({
		[`POST ${SESSIONS}`]: {
			status: 200,
			body: envelope({ challenge: "SOFTWARE_TOKEN_MFA" }),
		},
		[`POST ${SESSIONS}/challenge`]: answer,
	});
	await signIn("jose@acme.test", "Str0ng!pass");

	return calls;
};

const codeField = (): Promise<HTMLElement> =>
	screen.findByLabelText("Authentication code", { selector: "input" });

const enterCode = async (code: string): Promise<void> => {
	await userEvent.type(await codeField(), code);
	await userEvent.click(
		screen.getByRole("button", { name: "Verify and log in" })
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

describe("MfaChallengePage", () => {
	it("answers the Challenge with the code and continues to the page asked for", async () => {
		const calls = await meetChallenge(accessPassReply());
		renderAuthPage(<MfaChallengePage />, "/mfa?redirect=%2Fexample");

		await enterCode("123456");

		await waitFor(() => {
			expect(navigate).toHaveBeenCalledWith({ href: "/example" });
		});
		expect(calls[calls.length - 1]).toMatchObject({
			method: "POST",
			path: `${SESSIONS}/challenge`,
			body: { code: "123456" },
		});
		expect(hasAccessPass()).toBe(true);
	});

	it("asks for the numeric one-time code of an authenticator app", async () => {
		await meetChallenge(accessPassReply());
		renderAuthPage(<MfaChallengePage />);

		const field = await codeField();

		expect(field).toHaveAttribute("inputmode", "numeric");
		expect(field).toHaveAttribute("autocomplete", "one-time-code");
	});

	it("validates the code before calling the API", async () => {
		const calls = await meetChallenge(accessPassReply());
		renderAuthPage(<MfaChallengePage />);

		await enterCode("12345");

		expect(await codeField()).toHaveAccessibleDescription(
			"Enter the 6-digit code from your authenticator app"
		);
		expect(calls).toHaveLength(1);
	});

	it.each<[string, StubReply, string]>([
		[
			"a wrong code",
			problemReply(400, "INVALID_CODE"),
			"That code is not right. Check it and try again.",
		],
		[
			"an expired Challenge",
			problemReply(401, "CHALLENGE_EXPIRED"),
			"This login took too long. Log in again.",
		],
		[
			"too many attempts",
			problemReply(429, "RATE_LIMITED", { "Retry-After": "30" }),
			"Too many attempts. Try again in 30 seconds.",
		],
	])("explains %s on the field", async (_case, reply, message) => {
		await meetChallenge(reply);
		renderAuthPage(<MfaChallengePage />);

		await enterCode("123456");

		await waitFor(async () => {
			expect(await codeField()).toHaveAccessibleDescription(message);
		});
		expect(navigate).not.toHaveBeenCalled();
		expect(hasAccessPass()).toBe(false);
	});

	it("lets a person retry after a wrong code", async () => {
		await meetChallenge([problemReply(400, "INVALID_CODE"), accessPassReply()]);
		renderAuthPage(<MfaChallengePage />);

		await enterCode("111111");
		await waitFor(async () => {
			expect(await codeField()).toHaveAccessibleDescription(
				"That code is not right. Check it and try again."
			);
		});
		await userEvent.clear(await codeField());
		await enterCode("123456");

		await waitFor(() => {
			expect(navigate).toHaveBeenCalledWith({ href: "/" });
		});
	});

	it("sends a person without a Challenge back to sign in", async () => {
		renderAuthPage(<MfaChallengePage />);

		expect(
			await screen.findByRole("heading", { name: "No code needed" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Back to log in" })
		).toHaveAttribute("href", "/sign-in");
		expect(
			screen.queryByLabelText("Authentication code")
		).not.toBeInTheDocument();
	});
});
