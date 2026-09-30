import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { resetApiClient } from "@/common/api-client";
import { openApp, type OpenedApp } from "@/common/testing/openApp";
import { problemReply, stubApi } from "@/common/testing/stubApi";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";
import { withEmail } from "@/features/auth/historyState";
import en from "@/assets/locales/en/translations.json";

const EMAIL = "owner@acme.test";
const CONFIRM = "/api/v1/public/sign-up-confirmations";
const RESEND = "/api/v1/public/sign-up-confirmation-codes";
const copy = en.auth.emailConfirmation;
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
const open = async (entry = "/confirm-email"): Promise<OpenedApp> => {
	app = await openApp(entry);
	renderAuthApp(app);
	await screen.findByRole("heading", {
		name:
			entry === "/login"
				? "Log in"
				: entry === "/register"
					? "Sign up"
					: copy.title,
	});
	return app;
};
const fill = async (): Promise<void> => {
	const user = userEvent.setup();
	await user.type(screen.getByLabelText(copy.email), EMAIL);
	await user.type(screen.getByLabelText(copy.code), "123456");
};
const confirm = async (): Promise<void> => {
	await userEvent
		.setup()
		.click(screen.getByRole("button", { name: copy.submit }));
};
const privateLocation = (opened: OpenedApp): void => {
	expect(decodeURIComponent(opened.router.state.location.href)).not.toContain(
		EMAIL
	);
	expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain(
		EMAIL
	);
};

it("offers working empty fields on a direct visit, validates six digits, and ignores email search data", async () => {
	const calls = stubApi({});
	await open("/confirm-email?email=untrusted%40example.test");
	expect(screen.getByLabelText(copy.email)).toHaveValue("");
	expect(screen.getByLabelText(copy.code)).toHaveAttribute(
		"inputmode",
		"numeric"
	);
	expect(screen.getByLabelText(copy.code)).toHaveAttribute(
		"autocomplete",
		"one-time-code"
	);
	await confirm();
	expect(screen.getByLabelText(copy.email)).toHaveFocus();
	await fill();
	fireEvent.change(screen.getByLabelText(copy.code), {
		target: { value: "12345a" },
	});
	await confirm();
	expect(screen.getByLabelText(copy.code)).toHaveFocus();
	expect(screen.getByText(copy.codeFormat)).toBeVisible();
	expect(calls).toHaveLength(0);
});

it("carries the email from Onboarding, confirms anonymously, and lands on prefilled Log in without a banner or query string", async () => {
	const calls = stubApi({
		"POST /api/v1/public/onboardings": { status: 201 },
		[`POST ${CONFIRM}`]: { status: 204 },
	});
	const opened = await open("/register");
	const urls: Array<string> = [];
	const unsubscribe = opened.router.subscribe("onResolved", () => {
		urls.push(opened.router.state.location.href);
	});
	const user = userEvent.setup();
	await user.type(
		screen.getByLabelText("First name", { exact: true }),
		"Alice"
	);
	await user.type(screen.getByLabelText("Last name", { exact: true }), "Owner");
	await user.type(
		screen.getByLabelText("Company name", { exact: true }),
		"Acme"
	);
	await user.type(
		screen.getByLabelText("Registration number", { exact: true }),
		"202600001A"
	);
	await user.type(
		screen.getByLabelText("Workspace name", { exact: true }),
		"acme"
	);
	await user.type(
		screen.getByLabelText("Email address", { exact: true }),
		EMAIL
	);
	await user.type(
		screen.getByLabelText("Password", { exact: true }),
		"Example123!"
	);
	await user.type(
		screen.getByLabelText("Confirm password", { exact: true }),
		"Example123!"
	);
	await user.click(screen.getByRole("button", { name: "Sign up" }));
	await screen.findByRole("heading", { name: copy.title });
	expect(screen.getByLabelText(copy.email)).toHaveValue(EMAIL);
	privateLocation(opened);
	await user.type(screen.getByLabelText(copy.code), "123456");
	vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
	await act(async () => {
		fireEvent.click(screen.getByRole("button", { name: copy.submit }));
		await Promise.resolve();
	});
	expect(screen.getByRole("status")).toHaveTextContent(copy.redirecting);
	expect(opened.router.state.location.pathname).toBe("/confirm-email");
	expect(screen.getByLabelText(copy.email)).toBeDisabled();
	expect(screen.getByRole("button", { name: copy.submit })).toBeDisabled();
	expect(screen.getByRole("button", { name: copy.resend })).toBeDisabled();
	await act(async () => {
		fireEvent.submit(
			screen.getByRole("button", { name: copy.submit }).closest("form")!
		);
		await vi.advanceTimersByTimeAsync(2999);
	});
	expect(calls).toHaveLength(2);
	expect(opened.router.state.location.pathname).toBe("/confirm-email");
	await act(async () => {
		await vi.advanceTimersByTimeAsync(1);
	});
	vi.useRealTimers();
	await screen.findByRole("heading", { name: "Log in" });
	expect(opened.router.state.location.href).toBe("/login");
	expect(screen.getByLabelText("Email", { exact: true })).toHaveValue(EMAIL);
	expect(screen.queryByRole("status")).not.toBeInTheDocument();
	expect(calls[1]?.body).toEqual({ email: EMAIL, code: "123456" });
	expect(calls[1]?.headers.has("Authorization")).toBe(false);
	expect(calls[1]?.headers.get("Content-Type")).toBe("application/json");
	privateLocation(opened);
	expect(urls.length).toBeGreaterThanOrEqual(2);
	for (const url of urls) expect(decodeURIComponent(url)).not.toContain(EMAIL);
	unsubscribe();
});

it("cancels the delayed redirect when leaving confirmation", async () => {
	stubApi({ [`POST ${CONFIRM}`]: { status: 204 } });
	const opened = await open();
	await fill();
	vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
	await act(async () => {
		fireEvent.click(screen.getByRole("button", { name: copy.submit }));
		await Promise.resolve();
	});
	expect(screen.getByRole("status")).toHaveTextContent(copy.redirecting);
	await act(async () => {
		await opened.router.navigate({ to: "/register" });
	});
	await act(async () => {
		await vi.advanceTimersByTimeAsync(3000);
	});
	expect(opened.router.state.location.pathname).toBe("/register");
});

it("carries the email from a 403 EMAIL_NOT_VERIFIED at Log in", async () => {
	stubApi({
		"POST /api/v1/public/sessions": problemReply(403, "EMAIL_NOT_VERIFIED"),
	});
	const opened = await open("/login");
	const user = userEvent.setup();
	await user.type(screen.getByLabelText("Email", { exact: true }), EMAIL);
	await user.type(
		screen.getByLabelText("Password", { exact: true }),
		"Example123!"
	);
	await user.click(screen.getByRole("button", { name: "Log in" }));
	await screen.findByRole("heading", { name: copy.title });
	expect(opened.router.state.location.pathname).toBe("/confirm-email");
	expect(screen.getByLabelText(copy.email)).toHaveValue(EMAIL);
	privateLocation(opened);
});

it("prefills Log in from history", async () => {
	stubApi({});
	const opened = await open();
	await act(async () => {
		await opened.router.navigate({ to: "/login", state: withEmail(EMAIL) });
	});
	await screen.findByRole("heading", { name: "Log in" });
	expect(screen.getByLabelText("Email", { exact: true })).toHaveValue(EMAIL);
	expect(screen.queryByRole("status")).not.toBeInTheDocument();
	privateLocation(opened);
});

it.each(["true", "false", "1", "%22true%22", "%7B%7D"])(
	"ignores the legacy confirmation search value %s",
	async (value) => {
		stubApi({});
		app = await openApp(`/login?confirmed=${value}`);
		renderAuthApp(app);
		await screen.findByRole("heading", { name: "Log in" });
		expect(screen.queryByRole("status")).not.toBeInTheDocument();
	}
);

it("focuses the code for INVALID_CODE without showing API wording", async () => {
	stubApi({ [`POST ${CONFIRM}`]: problemReply(400, "INVALID_CODE") });
	await open();
	await fill();
	await confirm();
	expect(await screen.findByRole("alert")).toHaveTextContent(copy.invalidCode);
	await waitFor(() => {
		expect(screen.getByLabelText(copy.code)).toHaveFocus();
	});
	expect(screen.getByLabelText(copy.code)).toHaveAttribute(
		"aria-invalid",
		"true"
	);
	expect(screen.queryByText(/API says|Refused/)).not.toBeInTheDocument();
});

it("maps 400 field errors to local copy and focuses the first rejected field", async () => {
	stubApi({
		[`POST ${CONFIRM}`]: {
			status: 400,
			body: {
				errors: [
					{ field: "email", message: "private email" },
					{ field: "code", message: "private code" },
				],
			},
		},
	});
	await open();
	await fill();
	await confirm();
	await waitFor(() => {
		expect(screen.getByLabelText(copy.email)).toHaveFocus();
	});
	expect(screen.getByText(en.auth.validation.email)).toBeVisible();
	expect(screen.getByText(copy.codeFormat)).toBeVisible();
	expect(screen.queryByText(/private/)).not.toBeInTheDocument();
});

it.each([202, 400, 403, 404, 500])(
	"gives the same neutral resend answer for %i without requiring a code",
	async (status) => {
		const calls = stubApi({
			[`POST ${RESEND}`]: problemReply(status, "PRIVATE_REASON"),
		});
		const opened = await open();
		const user = userEvent.setup();
		await user.type(screen.getByLabelText(copy.email), ` ${EMAIL} `);
		await user.click(screen.getByRole("button", { name: copy.resend }));
		expect(await screen.findByRole("status")).toHaveTextContent(copy.resent);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		expect(calls[0]?.body).toEqual({ email: EMAIL });
		expect(calls[0]?.headers.has("Authorization")).toBe(false);
		privateLocation(opened);
	}
);

it("requires a valid email before sending a new code", async () => {
	const calls = stubApi({});
	await open();
	await userEvent
		.setup()
		.click(screen.getByRole("button", { name: copy.resend }));
	expect(screen.getByLabelText(copy.email)).toHaveFocus();
	expect(calls).toHaveLength(0);
});

it.each([CONFIRM, RESEND])("shows unreachable for %s", async (path) => {
	vi.stubGlobal("fetch", (): Promise<Response> =>
		Promise.reject(new TypeError("private network"))
	);
	await open();
	await fill();
	await userEvent.setup().click(
		screen.getByRole("button", {
			name: path === CONFIRM ? copy.submit : copy.resend,
		})
	);
	expect(await screen.findByRole("alert")).toHaveTextContent(
		en.auth.errors.unreachable
	);
	expect(screen.queryByRole("status")).not.toBeInTheDocument();
	expect(screen.queryByText(/private/)).not.toBeInTheDocument();
});

it.each([CONFIRM, RESEND])(
	"holds both actions after 429 on %s, then releases automatically",
	async (path) => {
		const calls = stubApi({
			[`POST ${path}`]: problemReply(429, "RATE_LIMITED", {
				"Retry-After": "30",
			}),
		});
		await open();
		await fill();
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
		await act(async () => {
			fireEvent.click(
				screen.getByRole("button", {
					name: path === CONFIRM ? copy.submit : copy.resend,
				})
			);
			await Promise.resolve();
		});
		const alert = screen.getByRole("alert");
		expect(alert).toHaveTextContent(en.auth.retryHold.aboutAMinute);
		expect(alert.parentElement).toHaveFocus();
		const submitButton = screen.getByRole("button", { name: copy.submit });
		const resendButton = screen.getByRole("button", { name: copy.resend });
		expect(submitButton).toBeDisabled();
		expect(resendButton).toBeDisabled();
		await act(async () => {
			await vi.advanceTimersByTimeAsync(29_999);
		});
		expect(submitButton).toBeDisabled();
		await act(async () => {
			fireEvent.submit(submitButton.closest("form") ?? submitButton);
			await Promise.resolve();
		});
		expect(calls).toHaveLength(1);
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1);
		});
		expect(submitButton).toBeEnabled();
		expect(resendButton).toBeEnabled();
		expect(screen.getByRole("alert")).toBe(alert);
		expect(alert).toHaveTextContent(en.auth.retryHold.aboutAMinute);
	}
);

it.each([CONFIRM, RESEND])(
	"shows the generic retry message without a hold for %s when Retry-After is missing",
	async (path) => {
		stubApi({ [`POST ${path}`]: problemReply(429, "RATE_LIMITED") });
		await open();
		await fill();
		await userEvent.setup().click(
			screen.getByRole("button", {
				name: path === CONFIRM ? copy.submit : copy.resend,
			})
		);
		expect(await screen.findByRole("alert")).toHaveTextContent(
			en.auth.retryHold.later
		);
		expect(screen.getByRole("button", { name: copy.submit })).toBeEnabled();
		expect(screen.getByRole("button", { name: copy.resend })).toBeEnabled();
	}
);
