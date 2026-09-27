import { apiRequest } from "@/common/api-client";
import { ApiProblemError } from "@/common/problem";

/**
 * The Session holder. The API keeps the Session itself as an httpOnly cookie
 * (ADR 0005); the app holds only a short-lived access pass, in memory, and
 * renews it from that cookie. Nothing here is ever written to web storage.
 *
 * - Renewal is single-flight within a tab and serialised across tabs with a
 *   Web Lock, so a rotated refresh cookie is never spent twice.
 * - The pass is renewed proactively about a minute before it expires.
 * - Signing out is broadcast, so every tab of this browser signs out.
 * - Ending the Session starts a new generation: a renewal still in flight
 *   from the old one cannot bring the pass or its timer back.
 */

const SESSIONS = "/api/v1/public/sessions";
const RENEW_LOCK = "horaion.session.renew";
const CHANNEL = "horaion.session";
const RENEW_AHEAD_MS = 60_000;
/** A pass this close to expiry is renewed before use rather than sent. */
const EXPIRY_MARGIN_MS = 5000;
const MS_PER_SECOND = 1000;

/** The Session routes' success body when no Challenge is pending. */
export type SessionTokens = {
	access_token: string;
	/** Lifetime of the access pass, in seconds. */
	expires_in: number;
};

export type ChallengeKind = "NEW_PASSWORD_REQUIRED" | "SOFTWARE_TOKEN_MFA";

export type SignInOutcome =
	{ status: "SIGNED_IN" } | { status: "CHALLENGE"; challenge: ChallengeKind };

export type ChallengeAnswer = { code: string } | { newPassword: string };

/**
 * - `signed-out`: this tab asked to sign out.
 * - `signed-out-elsewhere`: another tab signed out.
 * - `expired`: the API refused the Session and renewal could not help.
 */
export type SessionEndReason =
	"signed-out" | "signed-out-elsewhere" | "expired";

type SessionEndListener = (reason: SessionEndReason) => void;

type AccessPass = { token: string; expiresAt: number };

type SessionMessage = { type: "signed-out" };

let pass: AccessPass | null = null;
let pendingChallenge: ChallengeKind | null = null;
let renewal: Promise<string | null> | null = null;
let renewTimer: ReturnType<typeof setTimeout> | undefined;
/** Bumped whenever the Session ends; work started before then is stale. */
let generation = 0;
const listeners = new Set<SessionEndListener>();

const channel: BroadcastChannel | null =
	typeof BroadcastChannel === "undefined"
		? null
		: new BroadcastChannel(CHANNEL);

function isFresh(held: AccessPass | null): held is AccessPass {
	return held !== null && Date.now() < held.expiresAt - EXPIRY_MARGIN_MS;
}

function clearPass(): void {
	pass = null;
	clearTimeout(renewTimer);
	renewTimer = undefined;
}

/*
 * Renewal reschedules itself, so the timer and the renewal refer to each
 * other; the calls below run only after the module has loaded.
 */
/* eslint-disable no-use-before-define */
function scheduleRenewal(expiresAt: number): void {
	clearTimeout(renewTimer);
	const scheduledIn = generation;

	renewTimer = setTimeout(
		() => {
			renewSession()
				.then((token) => {
					if (token === null && generation === scheduledIn) {
						endSession("expired");
					}
				})
				// A failed proactive renewal is retried by the next request.
				.catch(() => {});
		},
		Math.max(0, expiresAt - RENEW_AHEAD_MS - Date.now())
	);
}
/* eslint-enable no-use-before-define */

/** Holds a pass the Session routes issued, and schedules its renewal. */
function holdAccessPass(tokens: SessionTokens): string {
	const expiresAt = Date.now() + tokens.expires_in * MS_PER_SECOND;

	pass = { token: tokens.access_token, expiresAt };
	scheduleRenewal(expiresAt);

	return tokens.access_token;
}

const isChallengeKind = (value: unknown): value is ChallengeKind =>
	value === "NEW_PASSWORD_REQUIRED" || value === "SOFTWARE_TOKEN_MFA";

/** Thrown when a Session route answers with a shape this app cannot use. */
export class UnexpectedSessionResponseError extends Error {
	public constructor() {
		super("The Session route answered with an unexpected shape");
		this.name = "UnexpectedSessionResponseError";
	}
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

/** Narrows a Session route's answer to a pass, refusing anything else. */
function sessionTokens(response: unknown): SessionTokens {
	if (
		isRecord(response) &&
		typeof response["access_token"] === "string" &&
		response["access_token"] !== "" &&
		typeof response["expires_in"] === "number" &&
		Number.isFinite(response["expires_in"]) &&
		response["expires_in"] > 0
	) {
		/* eslint-disable camelcase -- the API's JSON is snake_case */
		return {
			access_token: response["access_token"],
			expires_in: response["expires_in"],
		};
		/* eslint-enable camelcase */
	}

	throw new UnexpectedSessionResponseError();
}

/** Narrows a sign-in or Challenge answer: a known Challenge kind, or a pass. */
function sessionResponse(
	response: unknown
): { challenge: ChallengeKind } | SessionTokens {
	if (isRecord(response) && response["challenge"] !== undefined) {
		const challenge = response["challenge"];

		if (isChallengeKind(challenge)) {
			return { challenge };
		}

		throw new UnexpectedSessionResponseError();
	}

	return sessionTokens(response);
}

function withRenewLock<T>(work: () => Promise<T>): Promise<T> {
	if (typeof navigator === "undefined" || !("locks" in navigator)) {
		return work();
	}

	return navigator.locks.request(RENEW_LOCK, work);
}

async function refresh(): Promise<string | null> {
	const startedIn = generation;

	try {
		const response = await apiRequest<unknown>(`${SESSIONS}/refreshes`, {
			method: "POST",
			body: {},
			anonymous: true,
		});

		// Signed out while the request was in flight: the answer belongs to a
		// Session that has ended, so it must not restore the pass or its timer.
		if (generation !== startedIn) {
			return null;
		}

		return holdAccessPass(sessionTokens(response));
	} catch (cause) {
		if (cause instanceof ApiProblemError && cause.isUnauthenticated) {
			if (generation === startedIn) {
				clearPass();
			}

			return null;
		}

		throw cause;
	}
}

/**
 * Renews the access pass from the Session cookie. Resolves to the new pass,
 * or null when the Session has ended. Concurrent calls share one request.
 */
export function renewSession(): Promise<string | null> {
	if (renewal === null) {
		const current: Promise<string | null> = withRenewLock(refresh).finally(
			() => {
				// A sign-out may have let a newer renewal start meanwhile.
				if (renewal === current) {
					renewal = null;
				}
			}
		);
		renewal = current;
	}

	return renewal;
}

/** The access pass to send, renewed first when missing or about to expire. */
export function accessToken(): Promise<string | null> {
	return isFresh(pass) ? Promise.resolve(pass.token) : renewSession();
}

/** True when this tab holds an access pass that has not expired. */
export function hasAccessPass(): boolean {
	return isFresh(pass);
}

/** Runs `listener` whenever the Session ends in this tab. */
export function onSessionEnded(listener: SessionEndListener): () => void {
	listeners.add(listener);

	return () => {
		listeners.delete(listener);
	};
}

/**
 * Forgets the access pass and any pending Challenge and tells listeners. A
 * sign-out in this tab is also broadcast to the others.
 */
export function endSession(reason: SessionEndReason): void {
	generation += 1;
	renewal = null;
	clearPass();
	pendingChallenge = null;

	if (reason === "signed-out") {
		channel?.postMessage({ type: "signed-out" } satisfies SessionMessage);
	}

	for (const listener of listeners) {
		listener(reason);
	}
}

channel?.addEventListener("message", (event: MessageEvent<SessionMessage>) => {
	if (event.data.type === "signed-out") {
		endSession("signed-out-elsewhere");
	}
});

function settle(answer: unknown): SignInOutcome {
	const response = sessionResponse(answer);

	if ("challenge" in response) {
		clearPass();
		pendingChallenge = response.challenge;

		return { status: "CHALLENGE", challenge: response.challenge };
	}

	pendingChallenge = null;
	holdAccessPass(response);

	return { status: "SIGNED_IN" };
}

/**
 * Signs in with email and password. Either the Session starts, or a
 * Challenge must be answered first with {@link answerChallenge}.
 */
export async function signIn(
	email: string,
	password: string
): Promise<SignInOutcome> {
	const response = await apiRequest<unknown>(SESSIONS, {
		method: "POST",
		body: { email, password },
		anonymous: true,
	});

	return settle(response);
}

/** Answers the pending Challenge, held by the API in a short-lived cookie. */
export async function answerChallenge(
	answer: ChallengeAnswer
): Promise<SignInOutcome> {
	try {
		const response = await apiRequest<unknown>(`${SESSIONS}/challenge`, {
			method: "POST",
			/* eslint-disable camelcase -- the API's JSON is snake_case */
			body:
				"code" in answer
					? { code: answer.code }
					: { new_password: answer.newPassword },
			/* eslint-enable camelcase */
			anonymous: true,
		});

		return settle(response);
	} catch (cause) {
		if (
			cause instanceof ApiProblemError &&
			cause.errorCode === "CHALLENGE_EXPIRED"
		) {
			pendingChallenge = null;
		}

		throw cause;
	}
}

/**
 * The Challenge this tab is answering, if any. It lives only in memory, so a
 * reload forgets it and the person signs in again.
 */
export function pendingChallengeKind(): ChallengeKind | null {
	return pendingChallenge;
}

/**
 * Ends the Session on this device. The local pass is forgotten even if the
 * API cannot be reached; the cookie then expires on its own.
 */
export async function signOut(): Promise<void> {
	try {
		await apiRequest<void>(SESSIONS, {
			method: "DELETE",
			body: {},
			anonymous: true,
		});
	} catch {
		// Unreachable or already ended: the cookie then expires on its own.
	}

	endSession("signed-out");
}
