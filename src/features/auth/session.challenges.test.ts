import { afterEach, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
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
	logIn,
	logOut,
	pendingChallenge,
} from "@/features/auth/session";

const SESSIONS = "/api/v1/public/sessions";
afterEach(() => {
	endSession("expired");
	resetApiClient();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});
it("updates the pending kind, includes cookies, and holds the final pass in memory", async () => {
	const calls = stubApi({
		[`POST ${SESSIONS}`]: {
			status: 200,
			body: envelope({ challenge: "NEW_PASSWORD_REQUIRED" }),
		},
		[`POST ${SESSIONS}/challenge`]: [
			{ status: 200, body: envelope({ challenge: "SOFTWARE_TOKEN_MFA" }) },
			accessPassReply("completed-pass"),
		],
	});
	expect(pendingChallenge()).toBeNull();
	await logIn("owner@acme.test", "Temporary123!");
	expect(pendingChallenge()).toBe("NEW_PASSWORD_REQUIRED");
	await expect(
		answerChallenge({ newPassword: "Example123!" })
	).resolves.toEqual({ kind: "challenge", challenge: "SOFTWARE_TOKEN_MFA" });
	expect(pendingChallenge()).toBe("SOFTWARE_TOKEN_MFA");
	await expect(answerChallenge({ code: "012345" })).resolves.toMatchObject({
		kind: "session",
		accessToken: "completed-pass",
	});
	expect(pendingChallenge()).toBeNull();
	await expect(accessToken()).resolves.toBe("completed-pass");
	for (const call of calls.slice(1)) {
		expect(call.credentials).toBe("include");
		expect(call.headers.get("Content-Type")).toBe("application/json");
		expect(call.headers.has("Authorization")).toBe(false);
	}
});
it.each([204, 500, 429])(
	"clears a pending Challenge when Log out returns %i",
	async (status) => {
		stubApi({
			[`POST ${SESSIONS}`]: {
				status: 200,
				body: envelope({ challenge: "SOFTWARE_TOKEN_MFA" }),
			},
			[`DELETE ${SESSIONS}`]: { status },
		});
		await logIn("owner@acme.test", "Example123!");
		await logOut();
		expect(pendingChallenge()).toBeNull();
		expect(hasAccessPass()).toBe(false);
	}
);
it("clears the pending Challenge when the cookie expires", async () => {
	stubApi({
		[`POST ${SESSIONS}`]: {
			status: 200,
			body: envelope({ challenge: "SOFTWARE_TOKEN_MFA" }),
		},
		[`POST ${SESSIONS}/challenge`]: problemReply(401, "CHALLENGE_EXPIRED"),
	});
	await logIn("owner@acme.test", "Example123!");
	await expect(answerChallenge({ code: "123456" })).rejects.toMatchObject({
		reason: "challenge-expired",
	});
	expect(pendingChallenge()).toBeNull();
});
it("rejects an unknown Challenge kind without changing the current step", async () => {
	stubApi({
		[`POST ${SESSIONS}`]: {
			status: 200,
			body: envelope({ challenge: "SOFTWARE_TOKEN_MFA" }),
		},
		[`POST ${SESSIONS}/challenge`]: {
			status: 200,
			body: envelope({ challenge: "UNKNOWN_CHALLENGE" }),
		},
	});
	await logIn("owner@acme.test", "Example123!");
	await expect(answerChallenge({ code: "123456" })).rejects.toMatchObject({
		reason: "unexpected-response",
	});
	expect(pendingChallenge()).toBe("SOFTWARE_TOKEN_MFA");
	expect(hasAccessPass()).toBe(false);
});
it.each([
	{ accessToken: "late-pass", expiresIn: 900 },
	{ challenge: "SOFTWARE_TOKEN_MFA" },
])("does not revive a Session or Challenge after Log out: %j", async (data) => {
	stubApi({
		[`POST ${SESSIONS}`]: {
			status: 200,
			body: envelope({ challenge: "NEW_PASSWORD_REQUIRED" }),
		},
	});
	await logIn("owner@acme.test", "Temporary123!");
	let release: (response: Response) => void = () => {};
	vi.stubGlobal("fetch", (url: string): Promise<Response> =>
		url.endsWith("/challenge")
			? new Promise((resolve) => {
					release = resolve;
				})
			: Promise.resolve(new Response(null, { status: 204 }))
	);
	const answering = answerChallenge({ newPassword: "Example123!" });
	const rejected = expect(answering).rejects.toMatchObject({
		reason: "unexpected-response",
	});
	await logOut();
	release(new Response(JSON.stringify(envelope(data))));
	await rejected;
	expect(pendingChallenge()).toBeNull();
	expect(hasAccessPass()).toBe(false);
});
it("does not clear a newer Challenge when an old request reports expiry", async () => {
	stubApi({
		[`POST ${SESSIONS}`]: {
			status: 200,
			body: envelope({ challenge: "SOFTWARE_TOKEN_MFA" }),
		},
	});
	await logIn("owner@acme.test", "Example123!");
	let release: (response: Response) => void = () => {};
	vi.stubGlobal(
		"fetch",
		(): Promise<Response> =>
			new Promise((resolve) => {
				release = resolve;
			})
	);
	const answering = answerChallenge({ code: "123456" });
	const rejected = expect(answering).rejects.toMatchObject({
		reason: "challenge-expired",
	});
	stubApi({
		[`POST ${SESSIONS}`]: {
			status: 200,
			body: envelope({ challenge: "NEW_PASSWORD_REQUIRED" }),
		},
	});
	await logIn("owner@acme.test", "Temporary123!");
	release(
		new Response(JSON.stringify({ errorCode: "CHALLENGE_EXPIRED" }), {
			status: 401,
		})
	);
	await rejected;
	expect(pendingChallenge()).toBe("NEW_PASSWORD_REQUIRED");
});
