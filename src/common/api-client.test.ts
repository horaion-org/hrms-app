import { afterEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { apiRequest, apiRequestVoid } from "@/common/api-client";
import { stubApi, envelope, problemReply } from "@/common/testing/stubApi";

const path = "/api/v1/public/example";
const schema = z.object({ id: z.string() });
afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});
it("returns only the schema-parsed payload", async () => {
	stubApi({
		[`GET ${path}`]: {
			status: 200,
			body: envelope({ id: "one", extra: "discarded" }),
		},
	});
	await expect(apiRequest(path, schema, { anonymous: true })).resolves.toEqual({
		id: "one",
	});
});
it("reads an explicitly declared direct record without an envelope", async () => {
	stubApi({
		[`GET ${path}`]: { status: 200, body: { id: "one", extra: "discarded" } },
	});
	await expect(
		apiRequest(path, schema, { anonymous: true, responseFormat: "record" })
	).resolves.toEqual({ id: "one" });
});
it("does not accept a direct record on an envelope route", async () => {
	stubApi({ [`GET ${path}`]: { status: 200, body: { id: "one" } } });
	await expect(
		apiRequest(path, schema, { anonymous: true })
	).rejects.toMatchObject({
		reason: "unexpected-response",
	});
});
it.each([{}, { id: 3 }, envelope({ id: "one" })])(
	"refuses an invalid direct record: %j",
	async (body) => {
		stubApi({ [`GET ${path}`]: { status: 200, body } });
		await expect(
			apiRequest(path, schema, { anonymous: true, responseFormat: "record" })
		).rejects.toMatchObject({ reason: "unexpected-response" });
	}
);
it.each([
	{},
	{ success: false, data: { id: "x" } },
	envelope({ id: 3 }),
	envelope(null),
])("refuses an unexpected success shape: %j", async (body) => {
	stubApi({ [`GET ${path}`]: { status: 200, body } });
	await expect(
		apiRequest(path, schema, { anonymous: true })
	).rejects.toMatchObject({ reason: "unexpected-response" });
});
it("refuses invalid success JSON as a typed unexpected response", async () => {
	vi.stubGlobal("fetch", (): Promise<Response> =>
		Promise.resolve(new Response("not JSON"))
	);
	await expect(
		apiRequest(path, schema, { anonymous: true })
	).rejects.toMatchObject({ reason: "unexpected-response" });
});
it.each([202, 204])(
	"supports the explicit void contract for %i",
	async (status) => {
		stubApi({ [`POST ${path}`]: { status } });
		await expect(
			apiRequestVoid(path, { anonymous: true, method: "POST", body: {} })
		).resolves.toBeUndefined();
	}
);
it.each([undefined, "<html>gateway</html>"])(
	"tolerates a missing/non-JSON problem body: %s",
	async (body) => {
		vi.stubGlobal("fetch", (): Promise<Response> =>
			Promise.resolve(new Response(body, { status: 502 }))
		);
		await expect(
			apiRequest(path, schema, { anonymous: true })
		).rejects.toMatchObject({
			status: 502,
			errorCode: undefined,
			fieldErrors: [],
			retryAfterSeconds: undefined,
			reason: "http",
		});
	}
);
it("keeps field errors as data without using API prose as its message", async () => {
	stubApi({
		[`GET ${path}`]: {
			status: 400,
			body: {
				errorCode: "VALIDATION_ERROR",
				title: "private title",
				detail: "private detail",
				errors: [{ field: "email", message: "private field" }],
			},
		},
	});
	await expect(
		apiRequest(path, schema, { anonymous: true })
	).rejects.toMatchObject({
		status: 400,
		reason: "validation",
		errorCode: "VALIDATION_ERROR",
		message: "API request refused",
		fieldErrors: [{ field: "email", message: "private field" }],
	});
});
it.each([
	new TypeError("offline"),
	new DOMException("timeout", "TimeoutError"),
])("maps a transport failure to unreachable: %s", async (error) => {
	vi.stubGlobal("fetch", (): Promise<Response> => Promise.reject(error));
	await expect(
		apiRequest(path, schema, { anonymous: true })
	).rejects.toMatchObject({ reason: "unreachable" });
});
it.each([
	["42", 42],
	["0", 0],
	["garbage", undefined],
	["-3", undefined],
])("parses Retry-After %s", async (value, expected) => {
	stubApi({
		[`GET ${path}`]: problemReply(429, "RATE_LIMITED", {
			"Retry-After": value,
		}),
	});
	await expect(
		apiRequest(path, schema, { anonymous: true })
	).rejects.toMatchObject({
		status: 429,
		reason: "rate-limited",
		retryAfterSeconds: expected,
	});
});
it("parses an HTTP date Retry-After", async () => {
	vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-29T00:00:00Z"));
	stubApi({
		[`GET ${path}`]: problemReply(429, "RATE_LIMITED", {
			"Retry-After": "Tue, 29 Sep 2026 00:01:00 GMT",
		}),
	});
	await expect(
		apiRequest(path, schema, { anonymous: true })
	).rejects.toMatchObject({ retryAfterSeconds: 60 });
});
it("passes the caller's signal and rethrows its abort as itself, not as an outage", async () => {
	let received: AbortSignal | undefined;
	vi.stubGlobal(
		"fetch",
		(_url: string, init: RequestInit): Promise<Response> =>
			new Promise((_resolve, reject) => {
				received = init.signal ?? undefined;
				init.signal?.addEventListener("abort", () => {
					reject(new DOMException("Aborted", "AbortError"));
				});
			})
	);
	const controller = new AbortController();
	const reason = new Error("withdrawn");
	const request = apiRequest(path, schema, {
		anonymous: true,
		signal: controller.signal,
	});
	controller.abort(reason);
	await expect(request).rejects.toBe(reason);
	expect(received?.aborted).toBe(true);
});
