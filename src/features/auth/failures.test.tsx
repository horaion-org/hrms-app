import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { apiRequest, resetApiClient } from "@/common/api-client";
import {
	currentUserReply,
	openApp,
	type OpenedApp,
} from "@/common/testing/openApp";
import {
	accessPassReply,
	envelope,
	stubApi,
	type StubReply,
} from "@/common/testing/stubApi";
import {
	accessToken,
	endSession,
	hasAccessPass,
	onSessionEnded,
	renewSession,
} from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";

const REFRESH = "POST /api/v1/public/sessions/refreshes";
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
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	localStorage.clear();
	sessionStorage.clear();
});
const outages: Array<[string, () => StubReply]> = [
	[
		"network failure",
		(): StubReply => {
			throw new TypeError("offline");
		},
	],
	[
		"timeout",
		(): StubReply => {
			throw new DOMException("timeout", "TimeoutError");
		},
	],
	["503", (): StubReply => ({ status: 503 })],
	["429", (): StubReply => ({ status: 429 })],
	[
		"unexpected response",
		(): StubReply => ({ status: 200, body: envelope({ wrong: true }) }),
	],
];
it.each(outages)(
	"shows the retry screen on reload after %s and recovers",
	async (_name, failure) => {
		localStorage.setItem("company", "c-1");
		sessionStorage.setItem("existing", "kept");
		const storage = JSON.stringify({ ...localStorage, ...sessionStorage });
		const writes = vi.spyOn(Storage.prototype, "setItem");
		const removals = vi.spyOn(Storage.prototype, "removeItem");
		const clears = vi.spyOn(Storage.prototype, "clear");
		let reachable = false;
		const calls = stubApi({
			[REFRESH]: () => (reachable ? accessPassReply() : failure()),
			"GET /api/v1/me": currentUserReply(),
		});
		const ended = vi.fn();
		const disconnect = onSessionEnded(ended);
		try {
			app = await openApp("/?tab=2");
			renderAuthApp(app);
			expect(
				await screen.findByRole("heading", { name: "We can't reach Horaion" })
			).toBeVisible();
			expect(app.router.state.location.href).toBe("/?tab=2");
			expect(ended).not.toHaveBeenCalled();
			expect(JSON.stringify({ ...localStorage, ...sessionStorage })).toBe(
				storage
			);
			expect(writes).not.toHaveBeenCalled();
			expect(removals).not.toHaveBeenCalled();
			expect(clears).not.toHaveBeenCalled();
			reachable = true;
			await userEvent
				.setup()
				.click(screen.getByRole("button", { name: "Try again" }));
			expect(
				await screen.findByRole("heading", { name: "Dashboard" })
			).toBeVisible();
			expect(
				calls.filter((call) => call.path.endsWith("refreshes"))
			).toHaveLength(2);
			expect(app.router.state.location.href).toBe("/?tab=2");
		} finally {
			disconnect();
		}
	}
);
it.each(outages)(
	"keeps the Session when /me has %s and retries its load",
	async (_name, failure) => {
		let reachable = false;
		const calls = stubApi({
			[REFRESH]: accessPassReply(),
			"GET /api/v1/me": () => (reachable ? currentUserReply() : failure()),
		});
		app = await openApp("/");
		renderAuthApp(app);
		expect(
			await screen.findByRole("heading", { name: "We can't reach Horaion" })
		).toBeVisible();
		expect(hasAccessPass()).toBe(true);
		reachable = true;
		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Try again" }));
		expect(
			await screen.findByRole("heading", { name: "Dashboard" })
		).toBeVisible();
		expect(
			calls.filter((call) => call.path.endsWith("refreshes"))
		).toHaveLength(1);
	}
);
it.each(outages)(
	"reports unreachable renewal after %s without ending the Session",
	async (_name, failure) => {
		stubApi({ [REFRESH]: failure });
		const ended = vi.fn();
		const disconnect = onSessionEnded(ended);
		try {
			await expect(renewSession()).resolves.toEqual({ kind: "unreachable" });
			expect(ended).not.toHaveBeenCalled();
		} finally {
			disconnect();
		}
	}
);
it.each(["next request", "next tick"])(
	"keeps a proactive outage in memory and retries on the %s",
	async (retry) => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
		const calls = stubApi({
			[REFRESH]: [
				accessPassReply("first", 180),
				{ status: 503 },
				accessPassReply("recovered"),
			],
			"GET /api/v1/me": currentUserReply(),
		});
		app = await openApp("/");
		await vi.advanceTimersByTimeAsync(120_000);
		expect(hasAccessPass()).toBe(true);
		expect(app.router.state.location.pathname).toBe("/");
		expect(app.queryClient.getQueryData(["me"])).toBeDefined();
		expect(
			calls.filter((call) => call.path.endsWith("refreshes"))
		).toHaveLength(2);
		if (retry === "next tick") await vi.advanceTimersByTimeAsync(30_000);
		await expect(accessToken()).resolves.toBe("recovered");
		expect(
			calls.filter((call) => call.path.endsWith("refreshes"))
		).toHaveLength(3);
	}
);
it("surfaces unreachable during 401 renewal without retrying the bearer or clearing cache", async () => {
	const calls = stubApi({
		[REFRESH]: [accessPassReply(), { status: 503 }],
		"GET /api/v1/me": currentUserReply(),
		"GET /api/v1/example": { status: 401 },
	});
	app = await openApp("/");
	await expect(
		apiRequest("/api/v1/example", z.unknown())
	).rejects.toMatchObject({ reason: "unreachable" });
	expect(hasAccessPass()).toBe(true);
	expect(app.router.state.location.pathname).toBe("/");
	expect(app.queryClient.getQueryData(["me"])).toBeDefined();
	expect(calls.filter((call) => call.path.endsWith("example"))).toHaveLength(1);
});
it("surfaces unreachable before sending an expired access pass", async () => {
	vi.useFakeTimers({ toFake: ["Date"] });
	const calls = stubApi({
		[REFRESH]: [accessPassReply("old", 180), { status: 503 }],
		"GET /api/v1/me": currentUserReply(),
	});
	app = await openApp("/");
	vi.setSystemTime(Date.now() + 181_000);
	await expect(
		apiRequest("/api/v1/example", z.unknown())
	).rejects.toMatchObject({ reason: "unreachable" });
	expect(app.router.state.location.pathname).toBe("/");
	expect(app.queryClient.getQueryData(["me"])).toBeDefined();
	expect(calls.some((call) => call.path.endsWith("example"))).toBe(false);
});
it.each([undefined, "/?tab=2", "//evil.test", "https://evil.test"])(
	"redirects /login with a held pass via %s without fetch",
	async (destination) => {
		const calls = stubApi({
			[REFRESH]: accessPassReply(),
			"GET /api/v1/me": currentUserReply(),
		});
		app = await openApp("/");
		renderAuthApp(app);
		await screen.findByRole("heading", { name: "Dashboard" });
		calls.length = 0;
		const router = app.router;
		await act(async () => {
			await router.navigate({
				href:
					destination === undefined
						? "/login"
						: `/login?redirect=${encodeURIComponent(destination)}`,
			});
		});
		expect(router.state.location.href).toBe(
			destination === "/?tab=2" ? destination : "/"
		);
		expect(calls).toHaveLength(0);
		expect(
			screen.queryByRole("heading", { name: "Log in" })
		).not.toBeInTheDocument();
	}
);

it("does not mistake an access pass expiring during /me for an expired Session", async () => {
	vi.useFakeTimers({ toFake: ["Date"] });
	stubApi({
		[REFRESH]: accessPassReply("short-lived", 10),
		"GET /api/v1/me": () => {
			vi.setSystemTime(Date.now() + 11_000);
			return currentUserReply();
		},
	});
	app = await openApp("/");
	renderAuthApp(app);
	expect(
		await screen.findByRole("heading", { name: "Dashboard" })
	).toBeVisible();
	expect(app.router.state.location.pathname).toBe("/");
});
