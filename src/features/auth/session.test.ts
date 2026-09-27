import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	accessPassReply,
	envelope,
	problemReply,
	stubApi,
} from "@/common/testing/stubApi";
import {
	accessToken,
	answerChallenge,
	endSession,
	hasAccessPass,
	onSessionEnded,
	pendingChallengeKind,
	renewSession,
	signIn,
	signOut,
	type SessionEndReason,
	UnexpectedSessionResponseError,
} from "@/features/auth/session";

const SESSIONS = "/api/v1/public/sessions";
const REFRESH = `POST ${SESSIONS}/refreshes`;

let ended: Array<SessionEndReason> = [];
let stopListening: () => void = () => {};

const webStorage = (): string =>
	JSON.stringify({ ...window.localStorage, ...window.sessionStorage });

/** Lets queued promise callbacks and cross-channel messages run. */
const settle = (): Promise<void> =>
	new Promise((resolve) => {
		setTimeout(resolve, 20);
	});

beforeEach(() => {
	ended = [];
	stopListening = onSessionEnded((reason) => {
		ended.push(reason);
	});
});

afterEach(() => {
	stopListening();
	endSession("expired");
	vi.useRealTimers();
	vi.unstubAllGlobals();
	window.localStorage.clear();
	window.sessionStorage.clear();
});

describe("Session holder", () => {
	it("holds the pass from sign-in in memory only", async () => {
		const calls = stubApi({
			[`POST ${SESSIONS}`]: accessPassReply("pass-from-sign-in"),
		});

		await expect(signIn("jose@acme.test", "Str0ng!pass")).resolves.toEqual({
			status: "SIGNED_IN",
		});

		expect(hasAccessPass()).toBe(true);
		await expect(accessToken()).resolves.toBe("pass-from-sign-in");
		expect(calls).toHaveLength(1);
		expect(calls[0]?.credentials).toBe("include");
		expect(calls[0]?.body).toEqual({
			email: "jose@acme.test",
			password: "Str0ng!pass",
		});
		expect(webStorage()).not.toContain("pass-from-sign-in");
	});

	it("collapses concurrent renewals into one request", async () => {
		const calls = stubApi({ [REFRESH]: accessPassReply("renewed") });

		const tokens = await Promise.all([
			renewSession(),
			accessToken(),
			renewSession(),
		]);

		expect(tokens).toEqual(["renewed", "renewed", "renewed"]);
		expect(calls).toHaveLength(1);
		expect(calls[0]?.credentials).toBe("include");
	});

	it("renews under a Web Lock shared by every tab", async () => {
		const locked: Array<string> = [];
		vi.stubGlobal("navigator", {
			...navigator,
			locks: {
				request: (name: string, work: () => Promise<unknown>) => {
					locked.push(name);

					return work();
				},
			},
		});
		stubApi({ [REFRESH]: accessPassReply("renewed") });

		await renewSession();

		expect(locked).toEqual(["horaion.session.renew"]);
	});

	it("reports an ended Session as no pass", async () => {
		stubApi({ [REFRESH]: problemReply(401, "SESSION_EXPIRED") });

		await expect(renewSession()).resolves.toBeNull();
		expect(hasAccessPass()).toBe(false);
	});

	it("renews about a minute before the pass expires", async () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
		const calls = stubApi({
			[`POST ${SESSIONS}`]: accessPassReply("first", 900),
			[REFRESH]: accessPassReply("second", 900),
		});
		await signIn("jose@acme.test", "Str0ng!pass");

		await vi.advanceTimersByTimeAsync(838_000);
		expect(calls).toHaveLength(1);

		await vi.advanceTimersByTimeAsync(2000);
		expect(calls.map((call) => call.path)).toEqual([
			SESSIONS,
			`${SESSIONS}/refreshes`,
		]);
		await expect(accessToken()).resolves.toBe("second");
	});

	it("ends the Session when proactive renewal is refused", async () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
		stubApi({
			[`POST ${SESSIONS}`]: accessPassReply("first", 900),
			[REFRESH]: problemReply(401, "SESSION_EXPIRED"),
		});
		await signIn("jose@acme.test", "Str0ng!pass");

		await vi.advanceTimersByTimeAsync(900_000);

		expect(hasAccessPass()).toBe(false);
		expect(ended).toEqual(["expired"]);
	});

	it("renews a pass that has expired before sending it", async () => {
		vi.useFakeTimers({ toFake: ["Date"] });
		stubApi({
			[`POST ${SESSIONS}`]: accessPassReply("first", 900),
			[REFRESH]: accessPassReply("second", 900),
		});
		await signIn("jose@acme.test", "Str0ng!pass");

		vi.setSystemTime(Date.now() + 900_000);

		await expect(accessToken()).resolves.toBe("second");
	});
});

describe("Challenges", () => {
	it("keeps the pending Challenge and answers it with a new password", async () => {
		const calls = stubApi({
			[`POST ${SESSIONS}`]: {
				status: 200,
				body: envelope({ challenge: "NEW_PASSWORD_REQUIRED" }),
			},
			[`POST ${SESSIONS}/challenge`]: accessPassReply("after-challenge"),
		});

		await expect(signIn("jose@acme.test", "Temp0rary!")).resolves.toEqual({
			status: "CHALLENGE",
			challenge: "NEW_PASSWORD_REQUIRED",
		});
		expect(pendingChallengeKind()).toBe("NEW_PASSWORD_REQUIRED");
		expect(hasAccessPass()).toBe(false);

		await expect(
			answerChallenge({ newPassword: "N3w!password" })
		).resolves.toEqual({ status: "SIGNED_IN" });

		/* eslint-disable-next-line camelcase -- the API's JSON is snake_case */
		expect(calls[1]?.body).toEqual({ new_password: "N3w!password" });
		expect(calls[1]?.credentials).toBe("include");
		expect(pendingChallengeKind()).toBeNull();
		await expect(accessToken()).resolves.toBe("after-challenge");
	});

	it("forgets a Challenge the API says has expired", async () => {
		stubApi({
			[`POST ${SESSIONS}`]: {
				status: 200,
				body: envelope({ challenge: "NEW_PASSWORD_REQUIRED" }),
			},
			[`POST ${SESSIONS}/challenge`]: problemReply(401, "CHALLENGE_EXPIRED"),
		});
		await signIn("jose@acme.test", "Temp0rary!");

		await expect(
			answerChallenge({ newPassword: "N3w!password" })
		).rejects.toMatchObject({ errorCode: "CHALLENGE_EXPIRED" });
		expect(pendingChallengeKind()).toBeNull();
	});
});

describe("Unexpected answers", () => {
	it("refuses a sign-in answer without a usable pass", async () => {
		stubApi({
			[`POST ${SESSIONS}`]: {
				status: 200,
				/* eslint-disable-next-line camelcase -- the API's JSON is snake_case */
				body: envelope({ access_token: "", expires_in: "soon" }),
			},
		});

		await expect(signIn("jose@acme.test", "Str0ng!pass")).rejects.toThrow(
			UnexpectedSessionResponseError
		);
		expect(hasAccessPass()).toBe(false);
	});

	it("refuses a Challenge kind this app does not know", async () => {
		stubApi({
			[`POST ${SESSIONS}`]: {
				status: 200,
				body: envelope({ challenge: "SMS_MFA" }),
			},
		});

		await expect(signIn("jose@acme.test", "Str0ng!pass")).rejects.toThrow(
			UnexpectedSessionResponseError
		);
		expect(pendingChallengeKind()).toBeNull();
	});

	it("keeps no pass when a renewal answers with the wrong shape", async () => {
		stubApi({ [REFRESH]: { status: 200, body: envelope({}) } });

		await expect(renewSession()).rejects.toThrow(
			UnexpectedSessionResponseError
		);
		expect(hasAccessPass()).toBe(false);
	});
});

describe("Signing out", () => {
	it("ends the Session on this device and tells the other tabs", async () => {
		const calls = stubApi({
			[`POST ${SESSIONS}`]: accessPassReply("pass"),
			[`DELETE ${SESSIONS}`]: { status: 204 },
		});
		const otherTab = new BroadcastChannel("horaion.session");
		const heard: Array<unknown> = [];
		otherTab.addEventListener("message", (event) => {
			heard.push(event.data);
		});
		await signIn("jose@acme.test", "Str0ng!pass");

		await signOut();
		await settle();
		otherTab.close();

		expect(calls[1]).toMatchObject({
			method: "DELETE",
			credentials: "include",
		});
		expect(hasAccessPass()).toBe(false);
		expect(ended).toEqual(["signed-out"]);
		expect(heard).toEqual([{ type: "signed-out" }]);
	});

	it("still forgets the pass when the API cannot be reached", async () => {
		stubApi({
			[`POST ${SESSIONS}`]: accessPassReply("pass"),
			[`DELETE ${SESSIONS}`]: { status: 503 },
		});
		await signIn("jose@acme.test", "Str0ng!pass");

		await signOut();

		expect(hasAccessPass()).toBe(false);
		expect(ended).toEqual(["signed-out"]);
	});

	it("does not let a renewal in flight at sign-out bring the pass back", async () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
		const paths: Array<string> = [];
		let answerRefresh: (response: Response) => void = () => {};
		vi.stubGlobal(
			"fetch",
			(url: string, init: RequestInit = {}): Promise<Response> => {
				const path = new URL(url).pathname;
				paths.push(`${init.method ?? "GET"} ${path}`);

				return path === `${SESSIONS}/refreshes`
					? new Promise((resolve) => {
							answerRefresh = resolve;
						})
					: Promise.resolve(new Response(null, { status: 204 }));
			}
		);
		const renewing = renewSession();

		await signOut();
		answerRefresh(
			new Response(
				JSON.stringify(
					/* eslint-disable-next-line camelcase -- the API's JSON is snake_case */
					envelope({ access_token: "late-pass", expires_in: 900 })
				),
				{ status: 200, headers: { "Content-Type": "application/json" } }
			)
		);

		await expect(renewing).resolves.toBeNull();
		expect(hasAccessPass()).toBe(false);
		await vi.advanceTimersByTimeAsync(900_000);
		expect(paths).toEqual([REFRESH, `DELETE ${SESSIONS}`]);
		expect(ended).toEqual(["signed-out"]);
	});

	it("signs out when another tab does", async () => {
		stubApi({ [`POST ${SESSIONS}`]: accessPassReply("pass") });
		await signIn("jose@acme.test", "Str0ng!pass");
		const otherTab = new BroadcastChannel("horaion.session");

		otherTab.postMessage({ type: "signed-out" });
		await settle();
		otherTab.close();

		expect(hasAccessPass()).toBe(false);
		expect(ended).toEqual(["signed-out-elsewhere"]);
	});
});
