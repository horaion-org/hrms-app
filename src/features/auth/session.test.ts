import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { apiRequest, resetApiClient } from "@/common/api-client";
import {
	openApp,
	currentUserReply,
	settled,
	type OpenedApp,
} from "@/common/testing/openApp";
import {
	stubApi,
	accessPassReply,
	problemReply,
	envelope,
} from "@/common/testing/stubApi";
import {
	accessToken,
	hasAccessPass,
	renewSession,
	logIn,
	logOut,
	endSession,
} from "@/features/auth/session";

const channels = vi.hoisted(() => {
	class Channel {
		public static readonly instances = new Set<Channel>();
		private readonly listeners = new Set<
			(event: MessageEvent<unknown>) => void
		>();
		public constructor(public readonly name: string) {
			Channel.instances.add(this);
		}
		public addEventListener(
			_type: string,
			listener: (event: MessageEvent<unknown>) => void
		): void {
			this.listeners.add(listener);
		}
		public postMessage(data: unknown): void {
			for (const channel of Channel.instances) {
				if (channel !== this && channel.name === this.name) {
					for (const listener of channel.listeners)
						listener(new MessageEvent("message", { data }));
				}
			}
		}
		public close(): void {
			Channel.instances.delete(this);
		}
	}
	vi.stubGlobal("BroadcastChannel", Channel);
	return Channel;
});
const SESSIONS = "/api/v1/public/sessions";
const REFRESH = `POST ${SESSIONS}/refreshes`;
let app: OpenedApp | undefined;
afterEach(() => {
	app?.disconnect();
	app?.queryClient.clear();
	app = undefined;
	endSession("expired");
	resetApiClient();
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	window.localStorage.clear();
	window.sessionStorage.clear();
});

it("holds a trimmed Log in pass in memory and sends the cookie contract", async () => {
	const calls = stubApi({
		[`POST ${SESSIONS}`]: accessPassReply("memory-pass"),
	});
	await expect(logIn(" owner@acme.test ", "Example123!")).resolves.toEqual({
		kind: "session",
		accessToken: "memory-pass",
		expiresIn: 900,
	});
	expect(hasAccessPass()).toBe(true);
	await expect(accessToken()).resolves.toBe("memory-pass");
	expect(calls[0]).toMatchObject({
		credentials: "include",
		body: { email: "owner@acme.test", password: "Example123!" },
	});
	expect(calls[0]?.headers.get("Content-Type")).toBe("application/json");
	expect(calls[0]?.headers.has("Authorization")).toBe(false);
	expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain(
		"memory-pass"
	);
});
it("collapses concurrent renewal within a tab", async () => {
	const calls = stubApi({ [REFRESH]: accessPassReply("renewed") });
	await expect(
		Promise.all([renewSession(), accessToken(), renewSession()])
	).resolves.toEqual([{ kind: "renewed" }, "renewed", { kind: "renewed" }]);
	expect(calls).toHaveLength(1);
	expect(calls[0]).toMatchObject({ credentials: "include", body: {} });
	expect(calls[0]?.headers.get("Content-Type")).toBe("application/json");
});
it("waits for the shared Web Lock before sending a renewal", async () => {
	let releaseLock: () => void = () => {};
	const held = new Promise<void>((resolve) => {
		releaseLock = resolve;
	});
	const names: Array<string> = [];
	vi.stubGlobal("navigator", {
		locks: {
			request: async (
				name: string,
				work: () => Promise<unknown>
			): Promise<unknown> => {
				names.push(name);
				await held;
				return work();
			},
		},
	});
	const calls = stubApi({ [REFRESH]: accessPassReply() });
	const renewing = renewSession();
	expect(calls).toHaveLength(0);
	releaseLock();
	await renewing;
	expect(names).toEqual(["horaion.session.renew"]);
	expect(calls).toHaveLength(1);
});
it.each([180, 600, 1200])(
	"renews 60 seconds before the supplied %i-second lifetime",
	async (expiresIn) => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
		const calls = stubApi({
			[`POST ${SESSIONS}`]: accessPassReply("first", expiresIn),
			[REFRESH]: accessPassReply("next", expiresIn),
		});
		await logIn("owner@acme.test", "Example123!");
		await vi.advanceTimersByTimeAsync((expiresIn - 60) * 1000 - 1);
		expect(calls).toHaveLength(1);
		await vi.advanceTimersByTimeAsync(1);
		expect(calls).toHaveLength(2);
		await expect(accessToken()).resolves.toBe("next");
	}
);
it("renews an expired pass before using it", async () => {
	vi.useFakeTimers({ toFake: ["Date"] });
	stubApi({
		[`POST ${SESSIONS}`]: accessPassReply("old", 180),
		[REFRESH]: accessPassReply("new"),
	});
	await logIn("owner@acme.test", "Example123!");
	vi.setSystemTime(Date.now() + 181_000);
	await expect(accessToken()).resolves.toBe("new");
});
it("does not revive a Session when an in-flight renewal answers after Log out", async () => {
	let answer: (response: Response) => void = () => {};
	vi.stubGlobal("fetch", (url: string): Promise<Response> =>
		url.endsWith("/refreshes")
			? new Promise((resolve) => {
					answer = resolve;
				})
			: Promise.resolve(new Response(null, { status: 204 }))
	);
	const renewing = renewSession();
	await logOut();
	answer(
		new Response(
			JSON.stringify(envelope({ accessToken: "late", expiresIn: 900 }))
		)
	);
	await expect(renewing).resolves.toEqual({ kind: "expired" });
	expect(hasAccessPass()).toBe(false);
});
it("does not send a queued renewal after Log out", async () => {
	let releaseLock: () => void = () => {};
	const held = new Promise<void>((resolve) => {
		releaseLock = resolve;
	});
	vi.stubGlobal("navigator", {
		locks: {
			request: async (
				_name: string,
				work: () => Promise<unknown>
			): Promise<unknown> => {
				await held;
				return work();
			},
		},
	});
	const calls = stubApi({
		[`DELETE ${SESSIONS}`]: { status: 204 },
		[REFRESH]: accessPassReply("late"),
	});
	const renewing = renewSession();
	await logOut();
	releaseLock();
	await expect(renewing).resolves.toEqual({ kind: "expired" });
	expect(calls.map((call) => call.method)).toEqual(["DELETE"]);
});
it.each([
	{ accessToken: "", expiresIn: 900 },
	{ accessToken: "x", expiresIn: -1 },
	{ challenge: "SMS_MFA" },
	{ accessToken: "x", expiresIn: 900, challenge: "SOFTWARE_TOKEN_MFA" },
])("refuses an invalid Session answer %j", async (body) => {
	stubApi({ [`POST ${SESSIONS}`]: { status: 200, body: envelope(body) } });
	await expect(logIn("owner@acme.test", "Example123!")).rejects.toMatchObject({
		reason: "unexpected-response",
	});
	expect(hasAccessPass()).toBe(false);
});

describe("real route Session wiring", () => {
	it("renews on reload, loads /me, and caches it until Log out", async () => {
		const calls = stubApi({
			[REFRESH]: accessPassReply(),
			"GET /api/v1/me": currentUserReply(),
		});
		app = await openApp("/");
		expect(app.router.state.location.pathname).toBe("/");
		expect(app.queryClient.getQueryData(["me"])).toMatchObject({
			displayName: "José",
		});
		await app.router.invalidate();
		expect(calls.map((call) => call.path)).toEqual([
			`${SESSIONS}/refreshes`,
			"/api/v1/me",
		]);
	});
	it.each([
		problemReply(401, "SESSION_EXPIRED"),
		{ status: 401 },
		problemReply(403, "SESSION_EXPIRED"),
	])("returns failed renewal to Log in with its path: %j", async (reply) => {
		stubApi({ [REFRESH]: reply });
		app = await openApp("/?tab=2");
		expect(app.router.state.location.pathname).toBe("/login");
		expect(app.router.state.location.search).toEqual({ redirect: "/?tab=2" });
	});
	it("renews a refused bearer once and retries with the new pass", async () => {
		const calls = stubApi({
			[REFRESH]: [accessPassReply("first"), accessPassReply("renewed")],
			"GET /api/v1/me": currentUserReply(),
			"GET /api/v1/example": [
				{ status: 401 },
				{ status: 200, body: envelope({ id: "ok" }) },
			],
		});
		app = await openApp("/");
		await expect(
			apiRequest("/api/v1/example", z.object({ id: z.string() }))
		).resolves.toEqual({ id: "ok" });
		expect(
			calls
				.filter((call) => call.path.endsWith("example"))
				.map((call) => call.headers.get("Authorization"))
		).toEqual(["Bearer first", "Bearer renewed"]);
		expect(
			calls.filter((call) => call.path.endsWith("refreshes"))
		).toHaveLength(2);
	});
	it("ends the Session and clears cache when renewal is expired", async () => {
		const calls = stubApi({
			[REFRESH]: [accessPassReply(), problemReply(401, "SESSION_EXPIRED")],
			"GET /api/v1/me": currentUserReply(),
			"GET /api/v1/example": { status: 401 },
		});
		app = await openApp("/?tab=2");
		await expect(
			apiRequest("/api/v1/example", z.unknown())
		).rejects.toMatchObject({ status: 401 });
		await settled(app.router);
		expect(app.router.state.location.pathname).toBe("/login");
		expect(app.router.state.location.search).toEqual({ redirect: "/?tab=2" });
		expect(app.queryClient.getQueryCache().getAll()).toHaveLength(0);
		expect(hasAccessPass()).toBe(false);
		expect(calls.filter((call) => call.path.endsWith("example"))).toHaveLength(
			1
		);
	});
	it("surfaces a refused retry without ending a successfully renewed Session", async () => {
		const calls = stubApi({
			[REFRESH]: accessPassReply(),
			"GET /api/v1/me": currentUserReply(),
			"GET /api/v1/example": { status: 401 },
		});
		app = await openApp("/");
		await expect(
			apiRequest("/api/v1/example", z.unknown())
		).rejects.toMatchObject({ status: 401 });
		expect(hasAccessPass()).toBe(true);
		expect(app.router.state.location.pathname).toBe("/");
		expect(calls.filter((call) => call.path.endsWith("example"))).toHaveLength(
			2
		);
	});

	it.each([204, 429, 503])(
		"Log out clears the pass and cache and broadcasts after HTTP %i",
		async (status) => {
			const calls = stubApi({
				[REFRESH]: accessPassReply("clear-me"),
				"GET /api/v1/me": currentUserReply(),
				[`DELETE ${SESSIONS}`]: { status },
			});
			app = await openApp("/");
			app.queryClient.setQueryData(["private"], "cached");
			const otherTab = new channels("horaion.session");
			const heard: Array<unknown> = [];
			otherTab.addEventListener("message", (event) => {
				heard.push(event.data);
			});
			await logOut();
			await settled(app.router);
			otherTab.close();
			expect(hasAccessPass()).toBe(false);
			expect(app.queryClient.getQueryCache().getAll()).toHaveLength(0);
			expect(app.router.state.location.pathname).toBe("/login");
			expect(app.router.state.location.search).toEqual({});
			expect(heard).toEqual([{ type: "logged-out" }]);
			expect(calls[calls.length - 1]).toMatchObject({
				method: "DELETE",
				credentials: "include",
				body: {},
			});
			expect(calls[calls.length - 1]?.headers.get("Content-Type")).toBe(
				"application/json"
			);
			expect(
				JSON.stringify({ ...localStorage, ...sessionStorage })
			).not.toContain("clear-me");
		}
	);
	it("clears this tab and navigates to Log in when another tab broadcasts", async () => {
		stubApi({
			[REFRESH]: accessPassReply(),
			"GET /api/v1/me": currentUserReply(),
		});
		app = await openApp("/");
		const otherTab = new channels("horaion.session");
		otherTab.postMessage({ type: "logged-out" });
		await settled(app.router);
		otherTab.close();
		expect(hasAccessPass()).toBe(false);
		expect(app.queryClient.getQueryCache().getAll()).toHaveLength(0);
		expect(app.router.state.location.pathname).toBe("/login");
	});
	it("leaves the guarded page if proactive renewal fails", async () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
		stubApi({
			[REFRESH]: [
				accessPassReply("first", 180),
				problemReply(401, "SESSION_EXPIRED"),
			],
			"GET /api/v1/me": currentUserReply(),
		});
		app = await openApp("/");
		await vi.advanceTimersByTimeAsync(120_000);
		expect(hasAccessPass()).toBe(false);
		expect(app.router.state.location.pathname).toBe("/login");
		expect(app.queryClient.getQueryCache().getAll()).toHaveLength(0);
	});
});
