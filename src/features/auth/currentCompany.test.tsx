import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { z } from "zod";
import {
	apiRequest,
	apiRequestVoid,
	resetApiClient,
} from "@/common/api-client";
import {
	currentUserReply,
	membership,
	openApp,
	type OpenedApp,
} from "@/common/testing/openApp";
import {
	accessPassReply,
	problemReply,
	stubApi,
} from "@/common/testing/stubApi";
import {
	CURRENT_COMPANY_KEY,
	rememberCompany,
} from "@/features/auth/currentCompany";
import { endSession, hasAccessPass } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";

const REFRESH = "POST /api/v1/public/sessions/refreshes";
const ME = "GET /api/v1/me";
let app: OpenedApp | undefined;
beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	vi.stubGlobal("matchMedia", () => ({ matches: true }));
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
const open = async (): Promise<OpenedApp> => {
	app = await openApp("/");
	renderAuthApp(app);
	return app;
};
const companyHeading = (id: string): Promise<HTMLElement> =>
	screen.findByRole("heading", { name: `Company ${id}` });
const noAccess = (): Promise<HTMLElement> =>
	screen.findByRole("heading", {
		name: "You no longer have access to any company",
	});

it("uses the remembered company even when several are usable", async () => {
	rememberCompany("b");
	stubApi({
		[REFRESH]: accessPassReply(),
		[ME]: currentUserReply([membership("a"), membership("b")]),
	});
	await open();
	expect(await companyHeading("b")).toBeVisible();
});
it("uses the only usable company and hides switching", async () => {
	stubApi({ [REFRESH]: accessPassReply(), [ME]: currentUserReply() });
	await open();
	expect(await companyHeading("c-1")).toBeVisible();
	expect(
		screen.queryByRole("button", { name: "Switch company" })
	).not.toBeInTheDocument();
});
it.each([
	{ status: "INACTIVE" },
	{ companyStatus: "PENDING_VERIFICATION" },
	{ companyStatus: "SUSPENDED" },
	{ companyStatus: "CLOSED" },
])("ignores an unusable remembered company: %j", async (overrides) => {
	rememberCompany("a");
	stubApi({
		[REFRESH]: accessPassReply(),
		[ME]: currentUserReply([membership("a", overrides), membership("b")]),
	});
	await open();
	expect(await companyHeading("b")).toBeVisible();
});
it.each([undefined, "missing", "revoked"])(
	"asks for a choice when the remembered id is %s",
	async (remembered) => {
		if (remembered) rememberCompany(remembered);
		stubApi({
			[REFRESH]: accessPassReply(),
			[ME]: currentUserReply([
				membership("a"),
				membership("b"),
				membership("revoked", { status: "INACTIVE" }),
			]),
		});
		await open();
		expect(
			await screen.findByRole("heading", { name: "Choose a company" })
		).toBeVisible();
		expect(
			screen.queryByRole("button", { name: /revoked/ })
		).not.toBeInTheDocument();
	}
);
it.each([false, true])(
	"chooses and switches while retaining the Session (storage blocked: %s)",
	async (blocked) => {
		if (blocked) {
			vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
				throw new Error("blocked");
			});
		}
		const calls = stubApi({
			[REFRESH]: accessPassReply(),
			[ME]: currentUserReply([membership("a"), membership("b")]),
		});
		await open();
		const user = userEvent.setup();
		await user.click(
			await screen.findByRole("button", { name: "Company a a" })
		);
		expect(await companyHeading("a")).toBeVisible();
		await user.click(screen.getByRole("button", { name: "Switch company" }));
		await user.click(
			await screen.findByRole("button", { name: "Company b b" })
		);
		expect(await companyHeading("b")).toBeVisible();
		if (!blocked) expect(localStorage.getItem(CURRENT_COMPANY_KEY)).toBe("b");
		expect(calls.filter((call) => call.path === "/api/v1/me")).toHaveLength(1);
		expect(hasAccessPass()).toBe(true);
	}
);
it.each(["another", "picker", "none", "refused"])(
	"re-settles after a bearer revocation to %s",
	async (outcome) => {
		rememberCompany("a");
		const next =
			outcome === "refused"
				? problemReply(403, "MEMBERSHIP_REVOKED")
				: currentUserReply(
						outcome === "none"
							? []
							: outcome === "picker"
								? [membership("b"), membership("c")]
								: [membership("b")]
					);
		const calls = stubApi({
			[REFRESH]: accessPassReply(),
			[ME]: [currentUserReply([membership("a"), membership("b")]), next],
			"GET /api/v1/example": problemReply(403, "MEMBERSHIP_REVOKED"),
		});
		const opened = await open();
		await companyHeading("a");
		await act(async () => {
			await expect(
				apiRequest("/api/v1/example", z.unknown())
			).rejects.toMatchObject({ status: 403, errorCode: "MEMBERSHIP_REVOKED" });
		});
		if (outcome === "another") expect(await companyHeading("b")).toBeVisible();
		else if (outcome === "picker")
			expect(
				await screen.findByRole("heading", { name: "Choose a company" })
			).toBeVisible();
		else expect(await noAccess()).toBeVisible();
		expect(calls.filter((call) => call.path === "/api/v1/me")).toHaveLength(2);
		expect(
			calls.filter((call) => call.path.endsWith("refreshes"))
		).toHaveLength(1);
		expect(opened.router.state.location.pathname).toBe("/");
		expect(hasAccessPass()).toBe(true);
	}
);
it.each(["MEMBERSHIP_REVOKED", "AUTHORIZATION_DENIED", "empty"])(
	"shows no access for %s and ends the Session only on Log out",
	async (reason) => {
		const calls = stubApi({
			[REFRESH]: accessPassReply(),
			[ME]:
				reason === "empty" ? currentUserReply([]) : problemReply(403, reason),
			"DELETE /api/v1/public/sessions": { status: 204 },
		});
		const opened = await open();
		expect(await noAccess()).toBeVisible();
		expect(screen.queryByText(/API says|Refused/)).not.toBeInTheDocument();
		expect(hasAccessPass()).toBe(true);
		expect(calls.filter((call) => call.path === "/api/v1/me")).toHaveLength(1);
		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Log out" }));
		await waitFor(() => {
			expect(opened.router.state.location.pathname).toBe("/login");
		});
		expect(hasAccessPass()).toBe(false);
	}
);
it("handles revocation from a bearer retry after renewal", async () => {
	rememberCompany("a");
	stubApi({
		[REFRESH]: accessPassReply(),
		[ME]: [
			currentUserReply([membership("a")]),
			currentUserReply([membership("b")]),
		],
		"GET /api/v1/example": [
			{ status: 401 },
			problemReply(403, "MEMBERSHIP_REVOKED"),
		],
	});
	await open();
	await act(async () => {
		await expect(
			apiRequest("/api/v1/example", z.unknown())
		).rejects.toMatchObject({ errorCode: "MEMBERSHIP_REVOKED" });
	});
	expect(await companyHeading("b")).toBeVisible();
	expect(hasAccessPass()).toBe(true);
});

it("re-settles on a bodyless bearer mutation refusal", async () => {
	rememberCompany("a");
	stubApi({
		[REFRESH]: accessPassReply(),
		[ME]: [
			currentUserReply([membership("a")]),
			currentUserReply([membership("b")]),
		],
		"DELETE /api/v1/example": problemReply(403, "MEMBERSHIP_REVOKED"),
	});
	await open();
	await act(async () => {
		await expect(
			apiRequestVoid("/api/v1/example", { method: "DELETE" })
		).rejects.toMatchObject({ errorCode: "MEMBERSHIP_REVOKED" });
	});
	expect(await companyHeading("b")).toBeVisible();
	expect(hasAccessPass()).toBe(true);
});

it("re-runs the guard when a direct /me request is refused outside its load", async () => {
	const calls = stubApi({
		[REFRESH]: accessPassReply(),
		[ME]: [currentUserReply(), problemReply(403, "MEMBERSHIP_REVOKED")],
	});
	await open();
	await act(async () => {
		await expect(apiRequest("/api/v1/me", z.unknown())).rejects.toMatchObject({
			errorCode: "MEMBERSHIP_REVOKED",
		});
	});
	expect(await noAccess()).toBeVisible();
	expect(calls.filter((call) => call.path === "/api/v1/me")).toHaveLength(3);
	expect(hasAccessPass()).toBe(true);
});

it("restores a switched company with a fresh router and Session renewal", async () => {
	rememberCompany("a");
	stubApi({
		[REFRESH]: accessPassReply(),
		[ME]: currentUserReply([membership("a"), membership("b")]),
	});
	const opened = await open();
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: "Switch company" }));
	await user.click(await screen.findByRole("button", { name: "Company b b" }));
	expect(await companyHeading("b")).toBeVisible();
	opened.disconnect();
	opened.queryClient.clear();
	endSession("expired");
	app = await openApp("/");
	const match = app.router.state.matches.find(
		(item) => item.routeId === "/_authenticated"
	);
	expect(match?.context).toMatchObject({
		currentCompany: { kind: "settled", company: { companyId: "b" } },
	});
	expect(hasAccessPass()).toBe(true);
});
