import { z } from "zod";
import {
	readProblem,
	UnreachableError,
	UnexpectedResponseError,
} from "@/common/problem";
import { pagedSchema, type ListPage } from "@/common/schemas";

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
	/** JSON-serialised, except `FormData`, which is sent as multipart as it is. */
	body?: unknown;
	/** The `Accept` header; JSON unless a route answers with a file. */
	accept?: string;
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

/** The language the app shows; unknown until i18n names it. */
let uiLanguage: () => string | undefined = () => undefined;
/**
 * Names the app's UI language on every request as `Accept-Language`, so the
 * API words and seeds what it can in the language the person chose, not the
 * browser's. Called once by the i18n setup.
 */
export function configureApiLanguage(language: () => string | undefined): void {
	uiLanguage = language;
}
/** The `Accept-Language` header for the UI language; none before it is known. */
export const languageHeaders = (): Record<string, string> => {
	const language = uiLanguage();
	return language ? { "Accept-Language": language } : {};
};

/** FormData goes as multipart; anything else as JSON. */
const bodyOf = (body: unknown): BodyInit | undefined => {
	if (body instanceof FormData) return body;
	return body === undefined ? undefined : JSON.stringify(body);
};

async function send(
	path: string,
	options: RequestOptions,
	token: string | null
): Promise<Response> {
	const sessionRoute =
		path === "/api/v1/public/sessions" ||
		path.startsWith("/api/v1/public/sessions/");
	const multipart = options.body instanceof FormData;
	const headers = new Headers({
		Accept: options.accept ?? "application/json",
		...languageHeaders(),
	});
	// The browser sets a multipart body's Content-Type itself, with its boundary.
	if (!multipart && (sessionRoute || options.body !== undefined))
		headers.set("Content-Type", "application/json");
	if (token !== null) headers.set("Authorization", `Bearer ${token}`);
	const timeout = AbortSignal.timeout(20_000);
	try {
		return await fetch(
			`${(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "")}${path}`,
			{
				method: options.method ?? "GET",
				headers,
				body: bodyOf(options.body),
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
	options: RequestOptions & { responseFormat?: "envelope" | "record" } = {}
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
	if (options.responseFormat === "record") {
		const payload = schema.safeParse(body);
		if (!payload.success)
			throw new UnexpectedResponseError("API returned an unexpected payload");
		return payload.data;
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

/** One page of a paged list, read from the API's `content` and page total. */
export const fetchList = async <T extends z.ZodType>(
	path: string,
	item: T,
	signal?: AbortSignal
): Promise<ListPage<z.infer<T>>> => {
	const page = await apiRequest(path, pagedSchema(item), { signal });
	return { items: page.content, total: page.page.totalElements };
};

/** Explicitly bodyless contracts, including 202 and 204. */
export async function apiRequestVoid(
	path: string,
	options: RequestOptions = {}
): Promise<void> {
	await request(path, options);
}

/** A file the API answered with, and the name it suggests saving it under. */
export type DownloadedFile = { blob: Blob; fileName: string };

const fileNameOf = (disposition: string | null, fallback: string): string =>
	/filename="([^"]+)"/.exec(disposition ?? "")?.[1] ?? fallback;

/** A route that answers with a file (a spreadsheet), with the Session's token like any other call. */
export async function apiDownload(
	path: string,
	fallbackFileName: string
): Promise<DownloadedFile> {
	const response = await request(path, { accept: "*/*" });
	try {
		return {
			blob: await response.blob(),
			fileName: fileNameOf(
				response.headers.get("Content-Disposition"),
				fallbackFileName
			),
		};
	} catch {
		throw new UnreachableError("API response was interrupted");
	}
}
