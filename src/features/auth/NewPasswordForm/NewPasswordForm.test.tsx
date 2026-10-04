import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
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
import {
	endSession,
	hasAccessPass,
	logIn,
	pendingChallenge,
} from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";
import { authTestI18n } from "@/features/auth/testingI18n";
import { newPasswordFormSchema } from "@/features/auth/challenge";
import en from "@/assets/locales/en/translations.json";

const SESSIONS = "/api/v1/public/sessions";
const password = "Example123!";
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
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});
const open = async (entry: string): Promise<OpenedApp> => {
	app = await openApp(entry);
	renderAuthApp(app);
	return app;
};
const fillPassword = (confirmation = password): void => {
	fireEvent.change(screen.getByLabelText("New password", { exact: true }), {
		target: { value: password },
	});
	fireEvent.change(screen.getByLabelText("Confirm password", { exact: true }), {
		target: { value: confirmation },
	});
};

it.each([undefined, "/?tab=2", "https://evil.test", "//evil.test"])(
	"chains Log in → new password → authenticator code → the safe return path %s",
	async (redirect) => {
		const calls = stubApi({
			[`POST ${SESSIONS}`]: {
				status: 200,
				body: envelope({ challenge: "NEW_PASSWORD_REQUIRED" }),
			},
			[`POST ${SESSIONS}/challenge`]: [
				{ status: 200, body: envelope({ challenge: "SOFTWARE_TOKEN_MFA" }) },
				accessPassReply("challenge-pass"),
			],
			"GET /api/v1/me": currentUserReply(),
		});
		const opened = await open(
			redirect === undefined
				? "/login"
				: `/login?redirect=${encodeURIComponent(redirect)}`
		);
		await screen.findByRole("heading", { name: "Log in" });
		const user = userEvent.setup();
		await user.type(
			screen.getByLabelText("Email", { exact: true }),
			"owner@acme.test"
		);
		await user.type(
			screen.getByLabelText("Password", { exact: true }),
			password
		);
		await user.click(screen.getByRole("button", { name: "Log in" }));
		await screen.findByRole("heading", {
			name: en.auth.challenge.newPasswordTitle,
		});
		const target = redirect === "/?tab=2" ? redirect : "/";
		expect(opened.router.state.location.search).toEqual({ redirect: target });
		expect(pendingChallenge()).toBe("NEW_PASSWORD_REQUIRED");
		expect(hasAccessPass()).toBe(false);
		fillPassword();
		await user.click(screen.getByRole("button", { name: "Show password" }));
		expect(
			screen.getByLabelText("New password", { exact: true })
		).toHaveAttribute("type", "text");
		await user.click(screen.getByRole("button", { name: "Continue" }));
		await screen.findByRole("heading", { name: en.auth.challenge.codeTitle });
		expect(pendingChallenge()).toBe("SOFTWARE_TOKEN_MFA");
		expect(opened.router.state.location.search).toEqual({ redirect: target });
		await user.type(
			screen.getByLabelText("Authenticator code", { exact: true }),
			"012345"
		);
		await user.click(screen.getByRole("button", { name: "Continue" }));
		await screen.findByRole("heading", { name: "Dashboard" });
		expect(opened.router.state.location.href).toBe(target);
		expect(pendingChallenge()).toBeNull();
		expect(hasAccessPass()).toBe(true);
		expect(
			calls.filter((call) => call.path.endsWith("/challenge"))
		).toMatchObject([
			{
				method: "POST",
				credentials: "include",
				body: { newPassword: password },
			},
			{ method: "POST", credentials: "include", body: { code: "012345" } },
		]);
		expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toMatch(
			/challenge-pass|owner@acme.test|NEW_PASSWORD_REQUIRED|SOFTWARE_TOKEN_MFA/
		);
	}
);

it("checks matching passwords before sending, maps a policy refusal to the field, then retries successfully", async () => {
	const calls = stubApi({
		[`POST ${SESSIONS}`]: {
			status: 200,
			body: envelope({ challenge: "NEW_PASSWORD_REQUIRED" }),
		},
		[`POST ${SESSIONS}/challenge`]: [
			problemReply(400, "PASSWORD_POLICY_VIOLATION"),
			accessPassReply(),
		],
		"GET /api/v1/me": currentUserReply(),
	});
	await logIn("owner@acme.test", password);
	await open("/new-password");
	await screen.findByRole("heading", {
		name: en.auth.challenge.newPasswordTitle,
	});
	fillPassword("Different123!");
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: "Continue" }));
	expect(await screen.findByRole("alert")).toHaveTextContent(
		en.auth.challenge.passwordMismatch
	);
	expect(calls).toHaveLength(1);
	fillPassword();
	await user.click(screen.getByRole("button", { name: "Continue" }));
	expect(await screen.findByRole("alert")).toHaveTextContent(
		en.auth.challenge.passwordRejected
	);
	await waitFor(() => {
		expect(
			screen.getByLabelText("New password", { exact: true })
		).toHaveFocus();
	});
	expect(pendingChallenge()).toBe("NEW_PASSWORD_REQUIRED");
	expect(screen.queryByText(/API says|Refused/)).not.toBeInTheDocument();
	await user.click(screen.getByRole("button", { name: "Continue" }));
	await screen.findByRole("heading", { name: "Dashboard" });
});

it.each([
	"Ab1!abc",
	"a".repeat(125) + "B1!x",
	"abcdefgh1!",
	"ABCDEFGH1!",
	"Abcdefgh!",
	"Abcdefgh1",
	"Abcdefg1 ",
])("rejects a password outside the pool policy: %s", (newPassword) => {
	expect(
		newPasswordFormSchema(authTestI18n.t).safeParse({
			newPassword,
			confirmPassword: newPassword,
		}).success
	).toBe(false);
});
it.each(["Abcdef1!", "a".repeat(125) + "B1!"])(
	"accepts the password policy boundary: %s",
	(newPassword) => {
		expect(
			newPasswordFormSchema(authTestI18n.t).safeParse({
				newPassword,
				confirmPassword: newPassword,
			}).success
		).toBe(true);
	}
);

it("does not send a password that fails local policy", async () => {
	const calls = stubApi({
		[`POST ${SESSIONS}`]: {
			status: 200,
			body: envelope({ challenge: "NEW_PASSWORD_REQUIRED" }),
		},
	});
	await logIn("owner@acme.test", password);
	await open("/new-password");
	await screen.findByRole("heading", {
		name: en.auth.challenge.newPasswordTitle,
	});
	fireEvent.change(screen.getByLabelText("New password", { exact: true }), {
		target: { value: "weak" },
	});
	fireEvent.change(screen.getByLabelText("Confirm password", { exact: true }), {
		target: { value: "weak" },
	});
	await userEvent
		.setup()
		.click(screen.getByRole("button", { name: "Continue" }));
	expect(await screen.findByRole("alert")).toHaveTextContent(
		en.auth.challenge.passwordPolicy
	);
	expect(calls).toHaveLength(1);
});
