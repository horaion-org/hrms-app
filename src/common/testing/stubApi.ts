import { vi } from "vitest";

/** One canned answer from the stubbed API. */
export type StubReply = {
	status: number;
	body?: unknown;
	headers?: Record<string, string>;
};

/** A request the stubbed API received. */
type StubCall = {
	method: string;
	path: string;
	headers: Headers;
	credentials: RequestCredentials | undefined;
	body: unknown;
};

type Route = StubReply | ((call: StubCall) => StubReply);

/**
 * Stubs `fetch` with a table keyed by `"<METHOD> <path>"`. An array of
 * replies is answered in order, the last one repeating. Unknown routes answer
 * 404. Returns every call received, for asserting on what was sent.
 */
export const stubApi = (
	routes: Record<string, Route | Array<StubReply>>
): Array<StubCall> => {
	const calls: Array<StubCall> = [];

	vi.stubGlobal(
		"fetch",
		(url: string, init: RequestInit = {}): Promise<Response> => {
			const call: StubCall = {
				method: init.method ?? "GET",
				path: new URL(url, "http://localhost").pathname,
				headers: new Headers(init.headers),
				credentials: init.credentials,
				body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
			};
			calls.push(call);

			const route = routes[`${call.method} ${call.path}`];
			let reply: StubReply;

			if (route === undefined) {
				reply = { status: 404 };
			} else if (Array.isArray(route)) {
				reply = (route.length > 1 ? route.shift() : route[0]) ?? {
					status: 404,
				};
			} else {
				reply = typeof route === "function" ? route(call) : route;
			}

			return Promise.resolve(
				new Response(
					reply.body === undefined ? null : JSON.stringify(reply.body),
					{
						status: reply.status,
						headers: {
							"Content-Type": "application/json",
							...reply.headers,
						},
					}
				)
			);
		}
	);

	return calls;
};

/** Wraps `data` in the API's `ApiResponse` envelope. */
export const envelope = (data: unknown): unknown => ({
	success: true,
	data,
	message: "OK",
	timestamp: "2026-09-27T00:00:00Z",
	path: "/",
});

/** A 200 from a Session route carrying an access pass. */
export const accessPassReply = (
	token = "access-pass",
	expiresInSeconds = 900
): StubReply => ({
	status: 200,
	body: envelope({ accessToken: token, expiresIn: expiresInSeconds }),
});

/** An RFC 7807 refusal with a Horaion error code. */
export const problemReply = (
	status: number,
	errorCode: string,
	headers?: Record<string, string>
): StubReply => ({
	status,
	body: {
		status,
		title: "Refused",
		detail: `API says ${errorCode}`,
		errorCode,
	},
	headers,
});
