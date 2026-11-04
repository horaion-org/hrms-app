import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
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
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";

const REFRESH = "POST /api/v1/public/sessions/refreshes";
const SIGN_OUT = "DELETE /api/v1/public/sessions";
const ME = "GET /api/v1/me";
const WORKSPACE = "GET /api/v1/me/workspace";
const CHANGE = "PUT /api/v1/me/password";
const CURRENT = "Current123!";
const NEW = "Example123!";
const copy = en.auth.changePassword;

let app: OpenedApp | undefined;

beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	// Log in, where a successful change lands, reads the viewport.
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
	localStorage.clear();
});

/** A workspace granting nothing anywhere: changing one's own password needs nothing. */
const workspaceReply: StubReply = {
	status: 200,
	body: envelope({
		companies: [
			{ uuid: "c-1", name: "Company c-1", permissions: [], branches: [] },
		],
	}),
};

const routes = (change: StubReply): Record<string, StubReply> => ({
	[REFRESH]: accessPassReply(),
	[ME]: currentUserReply(),
	[WORKSPACE]: workspaceReply,
	[CHANGE]: change,
	[SIGN_OUT]: { status: 204 },
});

const open = async (entry = "/me/password"): Promise<OpenedApp> => {
	app = await openApp(entry);
	renderAuthApp(app);
	return app;
};

const openForm = async (): Promise<OpenedApp> => {
	const opened = await open();
	await screen.findByRole("heading", { level: 1, name: copy.title });
	return opened;
};

const fill = async (
	values: { current?: string; next?: string; confirm?: string } = {}
): Promise<void> => {
	const user = userEvent.setup();
	const { current = CURRENT, next = NEW, confirm = next } = values;
	if (current)
		await user.type(screen.getByLabelText(copy.currentPassword), current);
	if (next) await user.type(screen.getByLabelText(copy.newPassword), next);
	if (confirm)
		await user.type(screen.getByLabelText(copy.confirmPassword), confirm);
};

const submit = async (): Promise<void> => {
	await userEvent
		.setup()
		.click(screen.getByRole("button", { name: copy.submit }));
};

describe("Change password", () => {
	it("opens from the account menu in the header, with nothing granted", async () => {
		stubApi(routes({ status: 204 }));
		const { router } = await open("/");

		await userEvent
			.setup()
			.click(await screen.findByRole("button", { name: "Account menu" }));
		expect(
			screen.getByRole("menuitem", { name: "My profile" })
		).toHaveAttribute("href", "/me/profile");
		await userEvent
			.setup()
			.click(screen.getByRole("menuitem", { name: "Change password" }));

		expect(
			await screen.findByRole("heading", { level: 1, name: copy.title })
		).toBeVisible();
		expect(router.state.location.pathname).toBe("/me/password");
		expect(screen.getByLabelText(copy.currentPassword)).toHaveAttribute(
			"autocomplete",
			"current-password"
		);
		expect(screen.getByLabelText(copy.newPassword)).toHaveAttribute(
			"autocomplete",
			"new-password"
		);
		expect(
			screen.getByRole("button", { name: "Show current password" })
		).toBeVisible();
	});

	it("ticks each rule as the new password is typed", async () => {
		stubApi(routes({ status: 204 }));
		await openForm();
		const rules = within(screen.getByRole("list", { name: copy.rulesLabel }));
		expect(rules.getAllByText(copy.ruleUnmet)).toHaveLength(6);

		await fill({ next: "example1", confirm: "" });

		expect(
			rules.getByText(copy.rules.lowercase).parentElement
		).toHaveTextContent(copy.ruleMet);
		expect(
			rules.getByText(copy.rules.uppercase).parentElement
		).toHaveTextContent(copy.ruleUnmet);
		expect(
			rules.getByText(copy.rules.different).parentElement
		).toHaveTextContent(copy.ruleMet);
	});

	it("blocks a change that breaks the rules without calling the API", async () => {
		const calls = stubApi(routes({ status: 204 }));
		await openForm();

		await fill({ current: "", next: "short", confirm: "other" });
		await submit();

		expect(await screen.findByText(copy.currentRequired)).toBeVisible();
		expect(screen.getByText(copy.passwordPolicy)).toBeVisible();
		expect(screen.getByText(copy.passwordMismatch)).toBeVisible();
		expect(calls.some((call) => call.method === "PUT")).toBe(false);
	});

	it("refuses a new password equal to the current one before sending it", async () => {
		const calls = stubApi(routes({ status: 204 }));
		await openForm();

		await fill({ next: CURRENT });
		await submit();

		expect(await screen.findByText(copy.unchanged)).toBeVisible();
		expect(calls.some((call) => call.method === "PUT")).toBe(false);
	});

	it("sends the change with the access pass, logs out and lands on Log in with a status", async () => {
		const calls = stubApi(routes({ status: 204 }));
		const { router } = await openForm();

		await fill();
		await submit();

		await screen.findByRole("heading", { name: "Log in" });
		await waitFor(() => {
			expect(router.state.location.href).toBe("/login?passwordChanged=true");
		});
		expect(screen.getByRole("status")).toHaveTextContent(copy.success);
		const change = calls.find((call) => call.method === "PUT");
		expect(change?.body).toEqual({
			currentPassword: CURRENT,
			newPassword: NEW,
		});
		expect(change?.headers.get("Authorization")).toBe("Bearer access-pass");
		expect(
			calls.some((call) => `${call.method} ${call.path}` === SIGN_OUT)
		).toBe(true);
	});

	it("marks a wrong current password on its field and stays signed in", async () => {
		const calls = stubApi(routes(problemReply(400, "INVALID_CREDENTIALS")));
		const { router } = await openForm();

		await fill();
		await submit();

		expect(await screen.findByText(copy.invalidCurrent)).toBeVisible();
		expect(screen.getByLabelText(copy.currentPassword)).toHaveFocus();
		expect(router.state.location.pathname).toBe("/me/password");
		expect(
			calls.some((call) => `${call.method} ${call.path}` === SIGN_OUT)
		).toBe(false);
	});

	it.each([
		["PASSWORD_POLICY_VIOLATION", copy.passwordPolicy],
		["PASSWORD_UNCHANGED", copy.unchanged],
	])(
		"marks a %s refusal on the new password field",
		async (errorCode, message) => {
			stubApi(routes(problemReply(400, errorCode)));
			await openForm();

			await fill();
			await submit();

			expect(await screen.findByText(message)).toBeVisible();
			expect(screen.getByLabelText(copy.newPassword)).toHaveFocus();
		}
	);

	it("holds the form with the retry message when there were too many attempts", async () => {
		stubApi(
			routes(problemReply(429, "RATE_LIMITED", { "Retry-After": "120" }))
		);
		await openForm();

		await fill();
		await submit();

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Too many attempts. Try again in about 2 minutes."
		);
		expect(screen.getByRole("button", { name: copy.submit })).toBeDisabled();
	});
});
