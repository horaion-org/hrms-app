import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { resetApiClient } from "@/common/api-client";
import {
	currentUserReply,
	openApp,
	type OpenedApp,
} from "@/common/testing/openApp";
import {
	accessPassReply,
	envelope,
	problemReply,
	stubApi,
} from "@/common/testing/stubApi";
import { endSession, logIn, pendingChallenge } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";
import en from "@/assets/locales/en/translations.json";

const SESSIONS = "/api/v1/public/sessions";
const challengeReply = {
	status: 200,
	body: envelope({ challenge: "SOFTWARE_TOKEN_MFA" }),
};
let app: OpenedApp | undefined;
beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches: true,
		media: query,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	}));
});
afterEach(() => {
	app?.disconnect();
	app?.queryClient.clear();
	app = undefined;
	endSession("expired");
	resetApiClient();
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});
const open = async (entry = "/mfa"): Promise<OpenedApp> => {
	app = await openApp(entry);
	renderAuthApp(app);
	return app;
};

it("starts MFA from Log in, retries an invalid code without losing the Challenge, and reaches home", async () => {
	const calls = stubApi({
		[`POST ${SESSIONS}`]: challengeReply,
		[`POST ${SESSIONS}/challenge`]: [
			problemReply(400, "INVALID_CODE"),
			accessPassReply(),
		],
		"GET /api/v1/me": currentUserReply(),
	});
	const opened = await open("/login");
	await screen.findByRole("heading", { name: "Log in" });
	const user = userEvent.setup();
	await user.type(
		screen.getByLabelText("Email", { exact: true }),
		"owner@acme.test"
	);
	await user.type(
		screen.getByLabelText("Password", { exact: true }),
		"Example123!"
	);
	await user.click(screen.getByRole("button", { name: "Log in" }));
	await screen.findByRole("heading", { name: en.auth.challenge.codeTitle });
	const code = screen.getByLabelText("Authenticator code", { exact: true });
	expect(code).toHaveAttribute("inputmode", "numeric");
	expect(code).toHaveAttribute("autocomplete", "one-time-code");
	await user.type(code, "123456");
	await user.click(screen.getByRole("button", { name: "Continue" }));
	expect(await screen.findByRole("alert")).toHaveTextContent(
		en.auth.challenge.invalidCode
	);
	await waitFor(() => {
		expect(code).toHaveFocus();
	});
	expect(code).toHaveAttribute("aria-invalid", "true");
	expect(opened.router.state.location.pathname).toBe("/mfa");
	expect(pendingChallenge()).toBe("SOFTWARE_TOKEN_MFA");
	expect(screen.queryByText(/API says|Refused/)).not.toBeInTheDocument();
	await user.clear(code);
	await user.type(code, "012345");
	await user.click(screen.getByRole("button", { name: "Continue" }));
	await screen.findByRole("heading", { name: "Welcome, José" });
	expect(
		calls
			.filter((call) => call.path.endsWith("/challenge"))
			.map((call) => call.body)
	).toEqual([{ code: "123456" }, { code: "012345" }]);
});

it.each(["", "12345", "abcdef", "12345a"])(
	"requires six digits before sending %s",
	async (value) => {
		const calls = stubApi({ [`POST ${SESSIONS}`]: challengeReply });
		await logIn("owner@acme.test", "Example123!");
		await open();
		await screen.findByRole("heading", { name: en.auth.challenge.codeTitle });
		fireEvent.change(
			screen.getByLabelText("Authenticator code", { exact: true }),
			{ target: { value } }
		);
		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Continue" }));
		expect(await screen.findByRole("alert")).toHaveTextContent(
			en.auth.challenge.codeFormat
		);
		expect(calls).toHaveLength(1);
	}
);

it.each(["/mfa", "/new-password"])(
	"returns %s to Log in on expiry with a boolean status and the return path",
	async (route) => {
		const kind =
			route === "/mfa" ? "SOFTWARE_TOKEN_MFA" : "NEW_PASSWORD_REQUIRED";
		stubApi({
			[`POST ${SESSIONS}`]: {
				status: 200,
				body: envelope({ challenge: kind }),
			},
			[`POST ${SESSIONS}/challenge`]: problemReply(401, "CHALLENGE_EXPIRED"),
		});
		await logIn("owner@acme.test", "Example123!");
		const opened = await open(
			`${route}?redirect=${encodeURIComponent("/?tab=2")}`
		);
		await screen.findByRole("button", { name: "Continue" });
		if (route === "/mfa") {
			fireEvent.change(
				screen.getByLabelText("Authenticator code", { exact: true }),
				{ target: { value: "123456" } }
			);
		} else {
			fireEvent.change(screen.getByLabelText("New password", { exact: true }), {
				target: { value: "Example123!" },
			});
			fireEvent.change(
				screen.getByLabelText("Confirm password", { exact: true }),
				{ target: { value: "Example123!" } }
			);
		}
		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Continue" }));
		await screen.findByRole("heading", { name: "Log in" });
		expect(screen.getByRole("status")).toHaveTextContent(
			en.auth.challenge.expired
		);
		expect(opened.router.state.location.search).toEqual({
			redirect: "/?tab=2",
			challengeExpired: true,
		});
		expect(opened.router.state.location.href).not.toContain("owner");
		expect(pendingChallenge()).toBeNull();
	}
);

it.each(["/mfa", "/new-password"])(
	"redirects a direct visit to %s without calling the API",
	async (route) => {
		const calls = stubApi({});
		const opened = await open(
			`${route}?redirect=${encodeURIComponent("/?tab=2")}`
		);
		await screen.findByRole("heading", { name: "Log in" });
		expect(opened.router.state.location.search).toEqual({
			redirect: "/?tab=2",
		});
		expect(calls).toHaveLength(0);
	}
);
it.each(["/mfa", "/new-password"])(
	"redirects %s when a different kind is pending",
	async (route) => {
		stubApi({
			[`POST ${SESSIONS}`]: {
				status: 200,
				body: envelope({
					challenge:
						route === "/mfa" ? "NEW_PASSWORD_REQUIRED" : "SOFTWARE_TOKEN_MFA",
				}),
			},
		});
		await logIn("owner@acme.test", "Example123!");
		await open(route);
		await screen.findByRole("heading", { name: "Log in" });
	}
);
it.each(["false", "1", "owner@acme.test", "{}"])(
	"ignores a non-true expiry flag %s",
	async (flag) => {
		stubApi({});
		await open(`/login?challengeExpired=${encodeURIComponent(flag)}`);
		await screen.findByRole("heading", { name: "Log in" });
		expect(screen.queryByRole("status")).not.toBeInTheDocument();
	}
);

it.each(["/mfa", "/new-password"])(
	"holds %s submissions for Retry-After and then allows retry",
	async (route) => {
		const calls = stubApi({
			[`POST ${SESSIONS}`]: {
				status: 200,
				body: envelope({
					challenge:
						route === "/mfa" ? "SOFTWARE_TOKEN_MFA" : "NEW_PASSWORD_REQUIRED",
				}),
			},
			[`POST ${SESSIONS}/challenge`]: problemReply(429, "RATE_LIMITED", {
				"Retry-After": "30",
			}),
		});
		await logIn("owner@acme.test", "Example123!");
		await open(route);
		await screen.findByRole("button", { name: "Continue" });
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
		await act(async () => {
			if (route === "/mfa") {
				fireEvent.change(
					screen.getByLabelText("Authenticator code", { exact: true }),
					{ target: { value: "123456" } }
				);
			} else {
				fireEvent.change(
					screen.getByLabelText("New password", { exact: true }),
					{ target: { value: "Example123!" } }
				);
				fireEvent.change(
					screen.getByLabelText("Confirm password", { exact: true }),
					{ target: { value: "Example123!" } }
				);
			}
			fireEvent.click(screen.getByRole("button", { name: "Continue" }));
			await Promise.resolve();
		});
		const button = screen.getByRole("button", { name: "Continue" });
		const alert = screen.getByRole("alert");
		expect(alert).toHaveTextContent(
			"Too many attempts. Try again in about a minute."
		);
		expect(button).toBeDisabled();
		await act(async () => {
			await vi.advanceTimersByTimeAsync(29_999);
		});
		expect(button).toBeDisabled();
		await act(async () => {
			fireEvent.submit(button.closest("form") ?? button);
			await Promise.resolve();
		});
		expect(calls).toHaveLength(2);
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1);
		});
		expect(button).toBeEnabled();
		expect(screen.getByRole("alert")).toBe(alert);
		await act(async () => {
			fireEvent.click(button);
			await Promise.resolve();
		});
		expect(calls).toHaveLength(3);
	}
);
