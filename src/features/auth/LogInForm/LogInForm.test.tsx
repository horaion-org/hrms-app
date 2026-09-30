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
	type StubReply,
} from "@/common/testing/stubApi";
import { endSession, hasAccessPass } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";
import en from "@/assets/locales/en/translations.json";

const SESSIONS = "/api/v1/public/sessions";
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
const open = async (entry = "/login"): Promise<OpenedApp> => {
	app = await openApp(entry);
	renderAuthApp(app);
	await screen.findByRole("heading", { name: "Log in" });
	return app;
};
const submit = async (): Promise<void> => {
	const user = userEvent.setup();
	await user.type(
		screen.getByLabelText("Email", { exact: true }),
		" owner@acme.test "
	);
	await user.type(
		screen.getByLabelText("Password", { exact: true }),
		"Example123!"
	);
	await user.click(screen.getByRole("button", { name: "Log in" }));
};
it("opens without a request and offers Password reset and Sign up with no Remember me", async () => {
	const calls = stubApi({});
	await open();
	expect(calls).toHaveLength(0);
	expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
	expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute(
		"href",
		"/register"
	);
	expect(
		screen.getByRole("link", { name: "Having trouble logging in?" })
	).toHaveAttribute("href", "/forgot-password");
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: "Show password" }));
	expect(screen.getByLabelText("Password", { exact: true })).toHaveAttribute(
		"type",
		"text"
	);
});
it.each([
	undefined,
	"/?tab=2",
	"//evil.test",
	"https://evil.test",
	"/\\evil.test",
])(
	"logs in with a trimmed email, safely returns via %s and logs out",
	async (redirect) => {
		const calls = stubApi({
			[`POST ${SESSIONS}`]: accessPassReply("form-pass"),
			"GET /api/v1/me": currentUserReply(),
			[`DELETE ${SESSIONS}`]: { status: 204 },
		});
		const opened = await open(
			redirect === undefined
				? "/login"
				: `/login?redirect=${encodeURIComponent(redirect)}`
		);
		await submit();
		await screen.findByRole("heading", { name: "Welcome, José" });
		expect(opened.router.state.location.href).toBe(
			redirect === "/?tab=2" ? redirect : "/"
		);
		expect(calls[0]?.body).toEqual({
			email: "owner@acme.test",
			password: "Example123!",
		});
		expect(
			JSON.stringify({ ...localStorage, ...sessionStorage })
		).not.toContain("form-pass");
		expect(opened.router.state.location.href).not.toContain("owner");
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Log out" }));
		await screen.findByRole("heading", { name: "Log in" });
		expect(hasAccessPass()).toBe(false);
		expect(opened.queryClient.getQueryCache().getAll()).toHaveLength(0);
	}
);
const refusals: Array<[string, StubReply, string]> = [
	[
		"invalid credentials",
		problemReply(401, "INVALID_CREDENTIALS"),
		en.auth.errors.invalidCredentials,
	],
	[
		"origin refused",
		problemReply(403, "ORIGIN_REFUSED"),
		en.auth.errors.generic,
	],
	["unknown code", problemReply(500, "SOMETHING_NEW"), en.auth.errors.generic],
	["bare 400", { status: 400 }, en.auth.errors.generic],
	["bare 401", { status: 401 }, en.auth.errors.generic],
	[
		"unexpected response",
		{ status: 200, body: envelope({ accessToken: 3 }) },
		en.auth.errors.generic,
	],
];
it.each(refusals)(
	"shows local wording for %s and focuses the message",
	async (_label, reply, message) => {
		const calls = stubApi({ [`POST ${SESSIONS}`]: reply });
		const opened = await open();
		await submit();
		expect(await screen.findByRole("alert")).toHaveTextContent(message);
		await waitFor(() => {
			expect(screen.getByRole("alert").parentElement).toHaveFocus();
		});
		expect(screen.queryByText(/API says|Refused/)).not.toBeInTheDocument();
		expect(opened.router.state.location.pathname).toBe("/login");
		expect(calls).toHaveLength(1);
		expect(screen.getByRole("button", { name: "Log in" })).toBeEnabled();
	}
);
it("reports an unreachable API", async () => {
	vi.stubGlobal("fetch", (): Promise<Response> =>
		Promise.reject(new TypeError("private network detail"))
	);
	await open();
	await submit();
	expect(await screen.findByRole("alert")).toHaveTextContent(
		en.auth.errors.unreachable
	);
	expect(screen.queryByText("private network detail")).not.toBeInTheDocument();
});
it("maps server validation to fields and focuses the first rejected field after enabling them", async () => {
	stubApi({
		[`POST ${SESSIONS}`]: {
			status: 400,
			body: {
				title: "private title",
				errors: [
					{ field: "password", message: "private password" },
					{ field: "email", message: "private email" },
				],
			},
		},
	});
	await open();
	await submit();
	await waitFor(() => {
		expect(screen.getByLabelText("Password", { exact: true })).toHaveFocus();
	});
	expect(screen.getByLabelText("Password", { exact: true })).toHaveAttribute(
		"aria-invalid",
		"true"
	);
	expect(screen.getByLabelText("Email", { exact: true })).toHaveAttribute(
		"aria-invalid",
		"true"
	);
	expect(screen.getByText(en.auth.validation.passwordRejected)).toBeVisible();
	expect(screen.getByText(en.auth.validation.email)).toBeVisible();
	expect(screen.queryByText(/private/)).not.toBeInTheDocument();
});
it("validates required inputs before making a request", async () => {
	const calls = stubApi({});
	await open();
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: "Log in" }));
	await waitFor(() => {
		expect(screen.getByLabelText("Email", { exact: true })).toHaveFocus();
	});
	expect(calls).toHaveLength(0);
	expect(screen.getAllByText(en.auth.validation.required)).toHaveLength(2);
});
it("disables the fieldset and submit button while the request is pending", async () => {
	let answer: (response: Response) => void = () => {};
	vi.stubGlobal(
		"fetch",
		(): Promise<Response> =>
			new Promise((resolve) => {
				answer = resolve;
			})
	);
	await open();
	await submit();
	expect(screen.getByRole("group", { name: "Log in details" })).toBeDisabled();
	expect(screen.getByRole("button", { name: "Logging in…" })).toBeDisabled();
	await act(async () => {
		answer(new Response(null, { status: 500 }));
		await Promise.resolve();
	});
	expect(await screen.findByRole("alert")).toHaveTextContent(
		en.auth.errors.generic
	);
	expect(screen.getByRole("group", { name: "Log in details" })).toBeEnabled();
});
it("keeps the /sign-in alias pointing to Log in", async () => {
	stubApi({});
	const opened = await open("/sign-in");
	expect(opened.router.state.location.pathname).toBe("/login");
});

it.each([
	[30, "Too many attempts. Try again in about a minute."],
	[60, "Too many attempts. Try again in about 1 minute."],
	[61, "Too many attempts. Try again in about 2 minutes."],
	[3600, "Too many attempts. Try again in about 60 minutes."],
])(
	"holds a 429 submit for exactly %i seconds with one fixed alert",
	async (seconds, message) => {
		const calls = stubApi({
			[`POST ${SESSIONS}`]: problemReply(429, "RATE_LIMITED", {
				"Retry-After": String(seconds),
			}),
		});
		await open();
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
		await act(async () => {
			fireEvent.change(screen.getByLabelText("Email", { exact: true }), {
				target: { value: "owner@acme.test" },
			});
			fireEvent.change(screen.getByLabelText("Password", { exact: true }), {
				target: { value: "Example123!" },
			});
			fireEvent.click(screen.getByRole("button", { name: "Log in" }));
			await Promise.resolve();
		});
		const alert = screen.getByRole("alert");
		expect(alert).toHaveTextContent(message);
		expect(screen.getAllByRole("alert")).toHaveLength(1);
		const button = screen.getByRole("button", { name: "Log in" });
		expect(button).toBeDisabled();
		await act(async () => {
			await vi.advanceTimersByTimeAsync(seconds * 1000 - 1);
		});
		expect(button).toBeDisabled();
		expect(screen.getByRole("alert")).toBe(alert);
		expect(alert).toHaveTextContent(message);
		// Even a form submit dispatched directly cannot bypass the hold.
		await act(async () => {
			if (button.closest("form"))
				fireEvent.submit(button.closest("form") ?? button);
			await Promise.resolve();
		});
		expect(calls).toHaveLength(1);
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1);
		});
		expect(button).toBeEnabled();
		expect(screen.getByRole("alert")).toBe(alert);
		expect(alert).toHaveTextContent(message);
	}
);
it("uses a generic 429 message without holding when Retry-After is absent", async () => {
	stubApi({ [`POST ${SESSIONS}`]: problemReply(429, "RATE_LIMITED") });
	await open();
	await submit();
	expect(await screen.findByRole("alert")).toHaveTextContent(
		"Too many attempts. Try again later."
	);
	expect(screen.getByRole("button", { name: "Log in" })).toBeEnabled();
});
