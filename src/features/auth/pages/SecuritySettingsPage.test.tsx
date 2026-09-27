import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	envelope,
	problemReply,
	stubApi,
	type StubCall,
	type StubReply,
} from "@/common/testing/stubApi";
import { SecuritySettingsPage } from "@/features/auth/pages/SecuritySettingsPage";
import { endSession } from "@/features/auth/session";
import { renderAuthPage } from "@/features/auth/testing";
import { routeTree } from "@/routeTree.gen";
import { useToastStore } from "@/store/useToastStore";

const MFA = "/api/v1/me/mfa";
const SECRET = "JBSWY3DPEHPK3PXP";

const status = (totpEnabled: boolean): StubReply => ({
	status: 200,
	// eslint-disable-next-line camelcase -- the API's JSON is snake_case
	body: envelope({ totp_enabled: totpEnabled }),
});

const enrolment: StubReply = {
	status: 200,
	body: envelope({
		secret: SECRET,
		// eslint-disable-next-line camelcase -- the API's JSON is snake_case
		otpauth_uri: `otpauth://totp/Horaion:jose%40acme.test?secret=${SECRET}&issuer=Horaion`,
	}),
};

const renderPage = (): void => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	renderAuthPage(
		<QueryClientProvider client={queryClient}>
			<SecuritySettingsPage />
		</QueryClientProvider>,
		"/settings/security"
	);
};

const sent = (calls: Array<StubCall>): Array<string> =>
	calls.map((call) => `${call.method} ${call.path}`);

const confirmFirstCode = async (code = "123456"): Promise<void> => {
	await userEvent.type(
		await screen.findByLabelText("Code from the app", { selector: "input" }),
		code
	);
	await userEvent.click(
		screen.getByRole("button", { name: "Confirm and turn on" })
	);
};

const giveCredentials = async (): Promise<void> => {
	await userEvent.type(
		await screen.findByLabelText("Password", { selector: "input" }),
		"Str0ng!pass"
	);
	await userEvent.type(
		screen.getByLabelText("Current code", { selector: "input" }),
		"654321"
	);
};

beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	vi.stubGlobal("matchMedia", () => ({ matches: true }));
});

afterEach(() => {
	endSession("expired");
	useToastStore.setState({ toasts: [] });
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("SecuritySettingsPage", () => {
	it("turns MFA on only after the first code is confirmed", async () => {
		const calls = stubApi({
			[`GET ${MFA}`]: status(false),
			[`POST ${MFA}/totp`]: enrolment,
			[`POST ${MFA}/totp/verifications`]: { status: 204 },
		});
		renderPage();

		await userEvent.click(
			await screen.findByRole("button", { name: "Turn on authenticator app" })
		);

		expect(await screen.findByText(SECRET)).toBeInTheDocument();
		expect(
			await screen.findByRole("img", {
				name: "QR code to add Horaion to your authenticator app",
			})
		).toBeInTheDocument();
		expect(sent(calls)).not.toContain(`POST ${MFA}/totp/verifications`);

		await confirmFirstCode();

		expect(
			await screen.findByText(/Two-step login is on\. Logging in asks/)
		).toBeInTheDocument();
		expect(calls[calls.length - 1]?.body).toEqual({ code: "123456" });
		expect(useToastStore.getState().toasts[0]?.message).toBe(
			"Two-step login is on."
		);
	});

	it("keeps MFA off when the first code is refused", async () => {
		stubApi({
			[`GET ${MFA}`]: status(false),
			[`POST ${MFA}/totp`]: enrolment,
			[`POST ${MFA}/totp/verifications`]: problemReply(400, "INVALID_CODE"),
		});
		renderPage();

		await userEvent.click(
			await screen.findByRole("button", { name: "Turn on authenticator app" })
		);
		await confirmFirstCode();

		await waitFor(() => {
			expect(
				screen.getByLabelText("Code from the app", { selector: "input" })
			).toHaveAccessibleDescription(
				"That code is not right. Check it and try again."
			);
		});
		expect(screen.getByText(SECRET)).toBeInTheDocument();
	});

	it("turns MFA off with the password and a current code", async () => {
		const calls = stubApi({
			[`GET ${MFA}`]: status(true),
			[`DELETE ${MFA}/totp`]: { status: 204 },
		});
		renderPage();

		await giveCredentials();
		await userEvent.click(screen.getByRole("button", { name: "Turn off" }));

		expect(
			await screen.findByRole("button", { name: "Turn on authenticator app" })
		).toBeInTheDocument();
		expect(calls[calls.length - 1]).toMatchObject({
			method: "DELETE",
			path: `${MFA}/totp`,
			body: { password: "Str0ng!pass", code: "654321" },
		});
	});

	it("moves MFA to a new device: off with password and code, then a new enrolment", async () => {
		const calls = stubApi({
			[`GET ${MFA}`]: status(true),
			[`DELETE ${MFA}/totp`]: { status: 204 },
			[`POST ${MFA}/totp`]: enrolment,
			[`POST ${MFA}/totp/verifications`]: { status: 204 },
		});
		renderPage();

		await giveCredentials();
		await userEvent.click(
			screen.getByRole("button", { name: "Move to a new device" })
		);

		expect(await screen.findByText(SECRET)).toBeInTheDocument();
		expect(
			screen.getByText(
				"Two-step login is off until you confirm the new device."
			)
		).toBeInTheDocument();

		await confirmFirstCode();

		expect(
			await screen.findByLabelText("Current code", { selector: "input" })
		).toBeInTheDocument();
		expect(sent(calls)).toEqual([
			`GET ${MFA}`,
			`DELETE ${MFA}/totp`,
			`POST ${MFA}/totp`,
			`POST ${MFA}/totp/verifications`,
		]);
	});

	it.each<[string, StubReply, string, string]>([
		[
			"a wrong password",
			problemReply(400, "INVALID_CREDENTIALS"),
			"Password",
			"Your password is incorrect.",
		],
		[
			"a wrong code",
			problemReply(400, "INVALID_CODE"),
			"Current code",
			"That code is not right. Check it and try again.",
		],
	])("keeps MFA on and explains %s", async (_case, reply, field, message) => {
		const calls = stubApi({
			[`GET ${MFA}`]: status(true),
			[`DELETE ${MFA}/totp`]: reply,
		});
		renderPage();

		await giveCredentials();
		await userEvent.click(screen.getByRole("button", { name: "Turn off" }));

		await waitFor(() => {
			expect(
				screen.getByLabelText(field, { selector: "input" })
			).toHaveAccessibleDescription(message);
		});
		expect(sent(calls)).toEqual([`GET ${MFA}`, `DELETE ${MFA}/totp`]);
	});

	it("asks for the password and code before calling the API", async () => {
		const calls = stubApi({ [`GET ${MFA}`]: status(true) });
		renderPage();

		await userEvent.click(
			await screen.findByRole("button", { name: "Turn off" })
		);

		expect(
			screen.getByLabelText("Password", { selector: "input" })
		).toHaveAccessibleDescription("This field is required");
		expect(sent(calls)).toEqual([`GET ${MFA}`]);
	});

	it("offers a retry when the status cannot be loaded", async () => {
		stubApi({
			[`GET ${MFA}`]: [problemReply(500, "INTERNAL_ERROR"), status(false)],
		});
		renderPage();

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"We could not load your security settings."
		);
		await userEvent.click(screen.getByRole("button", { name: "Try again" }));

		expect(
			await screen.findByRole("button", { name: "Turn on authenticator app" })
		).toBeInTheDocument();
	});
});

describe("the security settings route", () => {
	it("is guarded: without a Session it returns through sign in", async () => {
		stubApi({
			"POST /api/v1/public/sessions/refreshes": problemReply(
				401,
				"SESSION_EXPIRED"
			),
		});
		const router = createRouter({
			routeTree,
			context: { queryClient: new QueryClient() },
			history: createMemoryHistory({ initialEntries: ["/settings/security"] }),
		});

		await router.load();

		expect(router.state.location.pathname).toBe("/sign-in");
		expect(router.state.location.search).toEqual({
			redirect: "/settings/security",
		});
	});
});
