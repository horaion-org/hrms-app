import { z } from "zod";
import {
	readProblem,
	UnreachableError,
	UnexpectedResponseError,
} from "@/common/problem";

export type RenewalOutcome =
	{ kind: "renewed" } | { kind: "expired" } | { kind: "unreachable" };

type ApiAuthentication = {
	accessToken: () => Promise<string | null>;
	renew: () => Promise<RenewalOutcome>;
	onUnauthenticated: () => void;
	onMembershipRevoked?: (path: string) => void;
};
type RequestOptions = {
	method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	body?: unknown;
	anonymous?: boolean;
	/** Aborts the request; an abort is rethrown as itself, never as an outage. */
	signal?: AbortSignal;
};
const emptySession: ApiAuthentication = {
	accessToken: () => Promise.resolve(null),
	renew: () => Promise.resolve({ kind: "expired" }),
	onUnauthenticated: () => {},
};
let authentication = emptySession;
export function configureApiClient(configured: ApiAuthentication): void {
	authentication = configured;
}
export function resetApiClient(): void {
	authentication = emptySession;
}

async function send(
	path: string,
	options: RequestOptions,
	token: string | null
): Promise<Response> {
	const sessionRoute =
		path === "/api/v1/public/sessions" ||
		path.startsWith("/api/v1/public/sessions/");
	const headers = new Headers({ Accept: "application/json" });
	if (sessionRoute || options.body !== undefined)
		headers.set("Content-Type", "application/json");
	if (token !== null) headers.set("Authorization", `Bearer ${token}`);
	const timeout = AbortSignal.timeout(20_000);
	try {
		return await fetch(
			`${(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "")}${path}`,
			{
				method: options.method ?? "GET",
				headers,
				body:
					options.body === undefined ? undefined : JSON.stringify(options.body),
				credentials: sessionRoute ? "include" : "same-origin",
				signal: options.signal
					? AbortSignal.any([options.signal, timeout])
					: timeout,
			}
		);
	} catch (cause) {
		// Cancelled by the caller (e.g. a query withdrawn after an access change): not an outage.
		if (options.signal?.aborted) throw options.signal.reason ?? cause;
		throw new UnreachableError("API could not be reached");
	}
}

async function request(
	path: string,
	options: RequestOptions
): Promise<Response> {
	const token = options.anonymous ? null : await authentication.accessToken();
	if (!options.anonymous && token === null) {
		authentication.onUnauthenticated();
		throw await readProblem(new Response(null, { status: 401 }));
	}
	const response = await send(path, options, token);
	if (response.ok) return response;
	const problem = await readProblem(response);
	if (
		!options.anonymous &&
		problem.status === 403 &&
		problem.errorCode === "MEMBERSHIP_REVOKED"
	)
		authentication.onMembershipRevoked?.(path);
	if (
		!options.anonymous &&
		problem.status === 401 &&
		problem.errorCode !== "INVALID_CREDENTIALS"
	) {
		const outcome = await authentication.renew();
		switch (outcome.kind) {
			case "expired":
				authentication.onUnauthenticated();
				throw problem;
			case "unreachable":
				throw new UnreachableError("Session renewal could not be reached");
			case "renewed":
				break;
			default: {
				const exhaustive: never = outcome;
				return exhaustive;
			}
		}
		const renewed = await authentication.accessToken();
		if (renewed === null) throw problem;
		const retry = await send(path, options, renewed);
		if (retry.ok) return retry;
		const retryProblem = await readProblem(retry);
		if (
			retryProblem.status === 403 &&
			retryProblem.errorCode === "MEMBERSHIP_REVOKED"
		)
			authentication.onMembershipRevoked?.(path);
		throw retryProblem;
	}
	throw problem;
}

/** A payload type can only come from a successful schema parse. */
export async function apiRequest<S extends z.ZodType>(
	path: string,
	schema: S,
	options: RequestOptions = {}
): Promise<z.output<S>> {
	const response = await request(path, options);
	let body: unknown;
	try {
		body = await response.json();
	} catch (cause) {
		if (!(cause instanceof SyntaxError))
			throw new UnreachableError("API response was interrupted");
		throw new UnexpectedResponseError("API returned invalid JSON");
	}
	const envelope = z
		.object({
			success: z.literal(true),
			message: z.string(),
			data: z.unknown(),
			path: z.string(),
			timestamp: z.string(),
		})
		.safeParse(body);
	if (!envelope.success)
		throw new UnexpectedResponseError("API returned an unexpected response");
	const payload = schema.safeParse(envelope.data.data);
	if (!payload.success)
		throw new UnexpectedResponseError("API returned an unexpected payload");
	return payload.data;
}

/** Explicitly bodyless contracts, including 202 and 204. */
export async function apiRequestVoid(
	path: string,
	options: RequestOptions = {}
): Promise<void> {
	await request(path, options);
}
