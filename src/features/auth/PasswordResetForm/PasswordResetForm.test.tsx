import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { resetApiClient } from "@/common/api-client";
import { openApp, type OpenedApp } from "@/common/testing/openApp";
import {
	problemReply,
	stubApi,
	type StubReply,
} from "@/common/testing/stubApi";
import { emailFromHistory } from "@/features/auth/historyState";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";
import en from "@/assets/locales/en/translations.json";

const REQUEST = "POST /api/v1/public/password-resets";
const COMPLETE = `${REQUEST}/completions`;
const EMAIL = "owner@acme.test";
const PASSWORD = "Example123!";
const copy = en.auth.passwordReset;
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
const open = async (entry = "/forgot-password"): Promise<OpenedApp> => {
	app = await openApp(entry);
	renderAuthApp(app);
	await screen.findByRole("heading", {
		name: entry.startsWith("/login") ? "Log in" : copy.title,
	});
	return app;
};
const request = async (email = EMAIL): Promise<void> => {
	const user = userEvent.setup();
	await user.type(screen.getByLabelText("Email", { exact: true }), email);
	await user.click(screen.getByRole("button", { name: copy.request }));
};
const fillCompletion = async (): Promise<void> => {
	const user = userEvent.setup();
	await user.type(screen.getByLabelText("Code", { exact: true }), "123456");
	await user.type(
		screen.getByLabelText("New password", { exact: true }),
		PASSWORD
	);
	await user.type(
		screen.getByLabelText("Confirm password", { exact: true }),
		PASSWORD
	);
};
const complete = async (): Promise<void> => {
	await fillCompletion();
	await userEvent
		.setup()
		.click(screen.getByRole("button", { name: copy.complete }));
};

it.each([EMAIL, "unknown@acme.test"])(
	"gives the same neutral answer for a 202 for %s",
	async (email) => {
		const calls = stubApi({
			[REQUEST]: {
				status: 202,
				body: { message: "private account information" },
			},
		});
		const opened = await open();
		await request(` ${email} `);
		expect(await screen.findByRole("status")).toHaveTextContent(copy.sent);
		expect(screen.queryByText(/private account/)).not.toBeInTheDocument();
		expect(screen.getByLabelText("Code")).toHaveAttribute(
			"inputmode",
			"numeric"
		);
		expect(screen.getByLabelText("Code")).toHaveAttribute(
			"autocomplete",
			"one-time-code"
		);
		expect(calls[0]?.body).toEqual({ email });
		expect(calls[0]?.headers.has("Authorization")).toBe(false);
		expect(opened.router.state.location.href).toBe("/forgot-password");
	}
);

it("carries the typed email from Log in and returns it in history state with the logged-out status", async () => {
	const calls = stubApi({
		[REQUEST]: { status: 202 },
		[COMPLETE]: { status: 204 },
	});
	const fetchSpy = vi.spyOn(globalThis, "fetch");
	const opened = await open("/login");
	const user = userEvent.setup();
	await user.type(screen.getByLabelText("Email", { exact: true }), EMAIL);
	await user.click(
		screen.getByRole("link", { name: "Having trouble logging in?" })
	);
	await screen.findByRole("heading", { name: copy.title });
	expect(screen.getByLabelText("Email", { exact: true })).toHaveValue(EMAIL);
	expect(opened.router.state.location.href).toBe("/forgot-password");
	await user.click(screen.getByRole("button", { name: copy.request }));
	await screen.findByLabelText("Code");
	await complete();
	await screen.findByRole("heading", { name: "Log in" });
	expect(emailFromHistory(opened.router.state.location.state)).toBe(EMAIL);
	expect(opened.router.state.location.href).toBe("/login?passwordReset=true");
	expect(screen.getByRole("status")).toHaveTextContent(copy.success);
	expect(calls[1]?.body).toEqual({
		email: EMAIL,
		code: "123456",
		newPassword: PASSWORD,
	});
	expect(calls[1]?.headers.has("Authorization")).toBe(false);
	for (const [url] of fetchSpy.mock.calls) {
		expect(url).not.toContain(EMAIL);
		expect(url).not.toContain(encodeURIComponent(EMAIL));
	}
	expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain(
		EMAIL
	);
});

it("allows opening the reset link with no email and keeps an email fallback", async () => {
	stubApi({});
	const opened = await open("/login");
	await userEvent
		.setup()
		.click(screen.getByRole("link", { name: "Having trouble logging in?" }));
	await screen.findByRole("heading", { name: copy.title });
	expect(emailFromHistory(opened.router.state.location.state)).toBeUndefined();
	expect(screen.getByLabelText("Email", { exact: true })).toHaveValue("");
});

it.each(["INVALID_CODE", "PASSWORD_POLICY_VIOLATION"])(
	"maps %s to a field with local wording",
	async (errorCode) => {
		stubApi({
			[REQUEST]: { status: 202 },
			[COMPLETE]: problemReply(400, errorCode),
		});
		await open();
		await request();
		await complete();
		const code = errorCode === "INVALID_CODE";
		expect(await screen.findByRole("alert")).toHaveTextContent(
			code ? copy.invalidCode : copy.passwordPolicy
		);
		await waitFor(() => {
			expect(
				screen.getByLabelText(code ? "Code" : "New password", { exact: true })
			).toHaveFocus();
		});
		expect(screen.queryByText(/API says|Refused/)).not.toBeInTheDocument();
	}
);

it("maps 400 validation errors to all recognized fields without showing server wording", async () => {
	stubApi({
		[REQUEST]: { status: 202 },
		[COMPLETE]: {
			status: 400,
			body: {
				title: "private title",
				errors: ["email", "code", "newPassword"].map((field) => ({
					field,
					message: "private message",
				})),
			},
		},
	});
	await open();
	await request();
	await complete();
	await waitFor(() => {
		expect(screen.getByLabelText("Email", { exact: true })).toHaveFocus();
	});
	for (const field of ["Email", "Code", "New password"])
		expect(screen.getByLabelText(field, { exact: true })).toHaveAttribute(
			"aria-invalid",
			"true"
		);
	expect(screen.queryByText(/private/)).not.toBeInTheDocument();
});

it("sends a new code without requiring completion fields and repeats the neutral answer", async () => {
	const calls = stubApi({ [REQUEST]: { status: 202 } });
	await open();
	await request();
	await userEvent
		.setup()
		.click(screen.getByRole("button", { name: copy.resend }));
	expect(await screen.findByRole("status")).toHaveTextContent(copy.sent);
	expect(calls).toHaveLength(2);
	expect(calls[1]?.body).toEqual({ email: EMAIL });
	expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it.each(["request", "complete", "resend"] as const)(
	"holds %s on 429 and releases automatically",
	async (operation) => {
		const limited = problemReply(429, "RATE_LIMITED", { "Retry-After": "2" });
		const calls = stubApi({
			[REQUEST]: operation === "request" ? limited : [{ status: 202 }, limited],
			[COMPLETE]: limited,
		});
		await open();
		if (operation !== "request") await request();
		if (operation === "complete") await fillCompletion();
		if (operation === "request")
			fireEvent.change(screen.getByLabelText("Email", { exact: true }), {
				target: { value: EMAIL },
			});
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
		const label =
			operation === "request"
				? copy.request
				: operation === "complete"
					? copy.complete
					: copy.resend;
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: label }));
			await Promise.resolve();
		});
		const alert = screen.getByRole("alert");
		expect(alert).toHaveTextContent(en.auth.retryHold.aboutAMinute);
		const button = screen.getByRole("button", { name: label });
		expect(button).toBeDisabled();
		if (operation !== "request") {
			expect(
				screen.getByRole("button", { name: copy.complete })
			).toBeDisabled();
			expect(screen.getByRole("button", { name: copy.resend })).toBeDisabled();
		}
		const count = calls.length;
		await act(async () => {
			fireEvent.submit(button.closest("form") ?? button);
			await vi.advanceTimersByTimeAsync(1999);
		});
		expect(calls).toHaveLength(count);
		expect(button).toBeDisabled();
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1);
		});
		expect(button).toBeEnabled();
		expect(screen.getByRole("alert")).toBe(alert);
	}
);

it("uses the generic retry message without a hold when Retry-After is missing", async () => {
	stubApi({ [REQUEST]: problemReply(429, "RATE_LIMITED") });
	await open();
	await request();
	expect(await screen.findByRole("alert")).toHaveTextContent(
		en.auth.retryHold.later
	);
	expect(screen.getByRole("button", { name: copy.request })).toBeEnabled();
});

it("stays on step one when unreachable", async () => {
	vi.stubGlobal("fetch", (): Promise<Response> =>
		Promise.reject(new TypeError("private failure"))
	);
	await open();
	await request();
	expect(await screen.findByRole("alert")).toHaveTextContent(
		en.auth.errors.unreachable
	);
	expect(screen.queryByLabelText("Code")).not.toBeInTheDocument();
});

it.each([
	"short",
	"abcdefgh1!",
	"ABCDEFGH1!",
	"Abcdefgh!!",
	"Abcdefgh12",
	"Aa1!" + "x".repeat(125),
])("checks the pool policy for %s before sending", async (password) => {
	const calls = stubApi({ [REQUEST]: { status: 202 } });
	await open();
	await request();
	fireEvent.change(screen.getByLabelText("Code"), {
		target: { value: "123456" },
	});
	fireEvent.change(screen.getByLabelText("New password", { exact: true }), {
		target: { value: password },
	});
	fireEvent.change(screen.getByLabelText("Confirm password", { exact: true }), {
		target: { value: password },
	});
	await userEvent
		.setup()
		.click(screen.getByRole("button", { name: copy.complete }));
	expect(await screen.findByRole("alert")).toHaveTextContent(
		copy.passwordPolicy
	);
	expect(calls).toHaveLength(1);
});

it("checks six numeric digits and matching passwords before sending", async () => {
	const calls = stubApi({ [REQUEST]: { status: 202 } });
	await open();
	await request();
	await fillCompletion();
	fireEvent.change(screen.getByLabelText("Code"), {
		target: { value: "12345x" },
	});
	fireEvent.change(screen.getByLabelText("Confirm password", { exact: true }), {
		target: { value: "Different123!" },
	});
	await userEvent
		.setup()
		.click(screen.getByRole("button", { name: copy.complete }));
	expect(await screen.findByText(copy.codeFormat)).toBeVisible();
	expect(screen.getByText(copy.passwordMismatch)).toBeVisible();
	expect(calls).toHaveLength(1);
});

const otherFailures: Array<StubReply> = [
	{ status: 400 },
	problemReply(500, "UNKNOWN"),
];
it.each(otherFailures)(
	"uses local fallback wording for an unmapped failure %#",
	async (reply) => {
		stubApi({ [REQUEST]: reply });
		await open();
		await request();
		expect(await screen.findByRole("alert")).toHaveTextContent(copy.failed);
	}
);

it.each(["true", "false", "garbage", "1"])(
	"parses the login success flag %s as a boolean only",
	async (flag) => {
		stubApi({});
		await open(`/login?passwordReset=${flag}`);
		if (flag === "true")
			expect(screen.getByRole("status")).toHaveTextContent(copy.success);
		else expect(screen.queryByRole("status")).not.toBeInTheDocument();
	}
);
