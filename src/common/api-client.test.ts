import { afterEach, describe, expect, it, vi } from "vitest";
import {
	apiRequest,
	configureApiClient,
	resetApiClient,
	type ApiAuthentication,
} from "@/common/api-client";
import { ApiProblemError } from "@/common/problem";
import {
	envelope,
	problemReply,
	stubApi,
	type StubCall,
} from "@/common/testing/stubApi";

const authenticate = (
	overrides: Partial<ApiAuthentication> = {}
): ApiAuthentication => {
	const authentication: ApiAuthentication = {
		accessToken: vi.fn(() => Promise.resolve("stale-pass")),
		renew: vi.fn(() => Promise.resolve("fresh-pass")),
		onUnauthenticated: vi.fn(),
		...overrides,
	};
	configureApiClient(authentication);

	return authentication;
};

const bearerOf = (call: StubCall | undefined): string | null =>
	call?.headers.get("Authorization") ?? null;

const failureOf = (promise: Promise<unknown>): Promise<ApiProblemError> =>
	promise.then(
		() => {
			throw new Error("expected a failure");
		},
		(error: unknown) => error as ApiProblemError
	);

afterEach(() => {
	vi.unstubAllGlobals();
	resetApiClient();
});

describe("apiRequest", () => {
	it("given_successEnvelope_when_requested_then_returnsOnlyTheData", async () => {
		stubApi({
			"GET /api/v1/roles": { status: 200, body: envelope({ id: "role-1" }) },
		});

		await expect(apiRequest<{ id: string }>("/api/v1/roles")).resolves.toEqual({
			id: "role-1",
		});
	});

	it.each([202, 204])(
		"given_%i_withoutABody_when_requested_then_resolvesUndefined",
		async (status) => {
			stubApi({ "POST /api/v1/public/password-resets": { status } });

			await expect(
				apiRequest<void>("/api/v1/public/password-resets", {
					method: "POST",
					body: {},
					anonymous: true,
				})
			).resolves.toBeUndefined();
		}
	);

	it("given_problemDetail_when_requested_then_throwsWithStatusAndErrorCode", async () => {
		stubApi({
			"GET /api/v1/roles": {
				status: 403,
				body: {
					status: 403,
					detail: "User 'sub' is not permitted to create Company 'c'",
					errorCode: "AUTHORIZATION_DENIED",
				},
			},
		});

		const problem = await failureOf(apiRequest("/api/v1/roles"));

		expect(problem).toBeInstanceOf(ApiProblemError);
		expect(problem.isForbidden).toBe(true);
		expect(problem.errorCode).toBe("AUTHORIZATION_DENIED");
		expect(problem.message).toContain("not permitted");
	});

	it("given_unparseableErrorBody_when_requested_then_stillThrowsWithTheStatus", async () => {
		vi.stubGlobal("fetch", (): Promise<Response> =>
			Promise.resolve(new Response("<html>gateway</html>", { status: 502 }))
		);

		const problem = await failureOf(apiRequest("/api/v1/roles"));

		expect(problem).toBeInstanceOf(ApiProblemError);
		expect(problem.status).toBe(502);
	});

	it("given_tooManyRequests_when_requested_then_readsRetryAfter", async () => {
		stubApi({
			"POST /api/v1/public/sessions": problemReply(429, "RATE_LIMITED", {
				"Retry-After": "42",
			}),
		});

		const problem = await failureOf(
			apiRequest("/api/v1/public/sessions", {
				method: "POST",
				body: {},
				anonymous: true,
			})
		);

		expect(problem.retryAfterSeconds).toBe(42);
	});

	it("given_anAccessPass_when_requested_then_sendsBearerAuthorization", async () => {
		const calls = stubApi({
			"GET /api/v1/me": { status: 200, body: envelope(null) },
		});
		authenticate({ accessToken: () => Promise.resolve("token-value") });

		await apiRequest("/api/v1/me");

		expect(bearerOf(calls[0])).toBe("Bearer token-value");
	});

	it("given_anonymousRequest_when_requested_then_omitsAuthorization", async () => {
		const calls = stubApi({
			"POST /api/v1/public/onboardings": { status: 200, body: envelope(null) },
		});
		authenticate();

		await apiRequest("/api/v1/public/onboardings", {
			method: "POST",
			body: {},
			anonymous: true,
		});

		expect(calls[0]?.headers.has("Authorization")).toBe(false);
	});

	it("given_aSessionRoute_when_requested_then_includesCredentials", async () => {
		const calls = stubApi({
			"POST /api/v1/public/sessions/refreshes": {
				status: 200,
				body: envelope(null),
			},
			"POST /api/v1/public/onboardings": { status: 200, body: envelope(null) },
		});

		await apiRequest("/api/v1/public/sessions/refreshes", {
			method: "POST",
			body: {},
			anonymous: true,
		});
		await apiRequest("/api/v1/public/onboardings", {
			method: "POST",
			body: {},
			anonymous: true,
		});

		expect(calls.map((call) => call.credentials)).toEqual([
			"include",
			"same-origin",
		]);
	});

	it("given_anExpiredPass_when_refused_then_renewsOnceAndRetries", async () => {
		const calls = stubApi({
			"GET /api/v1/me": (call) =>
				bearerOf(call) === "Bearer fresh-pass"
					? { status: 200, body: envelope({ id: "me" }) }
					: problemReply(401, "UNAUTHENTICATED"),
		});
		const authentication = authenticate();

		await expect(apiRequest("/api/v1/me")).resolves.toEqual({ id: "me" });

		expect(calls.map(bearerOf)).toEqual([
			"Bearer stale-pass",
			"Bearer fresh-pass",
		]);
		expect(authentication.renew).toHaveBeenCalledTimes(1);
		expect(authentication.onUnauthenticated).not.toHaveBeenCalled();
	});

	it("given_anEndedSession_when_refused_then_signsOutWithoutRetrying", async () => {
		const calls = stubApi({
			"GET /api/v1/me": problemReply(401, "UNAUTHENTICATED"),
		});
		const authentication = authenticate({ renew: () => Promise.resolve(null) });

		const problem = await failureOf(apiRequest("/api/v1/me"));

		expect(problem.isUnauthenticated).toBe(true);
		expect(calls).toHaveLength(1);
		expect(authentication.onUnauthenticated).toHaveBeenCalledTimes(1);
	});

	it("given_theRetryIsAlsoRefused_when_requested_then_signsOutOnce", async () => {
		const calls = stubApi({
			"GET /api/v1/me": problemReply(401, "UNAUTHENTICATED"),
		});
		const authentication = authenticate();

		await failureOf(apiRequest("/api/v1/me"));

		expect(calls).toHaveLength(2);
		expect(authentication.renew).toHaveBeenCalledTimes(1);
		expect(authentication.onUnauthenticated).toHaveBeenCalledTimes(1);
	});

	it("given_aWrongPassword_when_refused_then_throwsWithoutEndingTheSession", async () => {
		const calls = stubApi({
			"DELETE /api/v1/me/mfa/totp": problemReply(401, "INVALID_CREDENTIALS"),
		});
		const authentication = authenticate();

		const problem = await failureOf(
			apiRequest("/api/v1/me/mfa/totp", { method: "DELETE", body: {} })
		);

		expect(problem.errorCode).toBe("INVALID_CREDENTIALS");
		expect(calls).toHaveLength(1);
		expect(authentication.renew).not.toHaveBeenCalled();
		expect(authentication.onUnauthenticated).not.toHaveBeenCalled();
	});

	it("given_anAnonymousRefusal_when_requested_then_doesNotRenew", async () => {
		stubApi({
			"POST /api/v1/public/sessions": problemReply(401, "INVALID_CREDENTIALS"),
		});
		const authentication = authenticate();

		await failureOf(
			apiRequest("/api/v1/public/sessions", {
				method: "POST",
				body: {},
				anonymous: true,
			})
		);

		expect(authentication.renew).not.toHaveBeenCalled();
		expect(authentication.onUnauthenticated).not.toHaveBeenCalled();
	});

	it("given_aBaseUrlWithATrailingSlash_when_requested_then_doesNotDoubleTheSeparator", async () => {
		vi.stubEnv("VITE_API_BASE_URL", "http://api.test/");
		const calls = stubApi({
			"GET /api/v1/me": { status: 200, body: envelope(null) },
		});

		await apiRequest("/api/v1/me");

		expect(calls[0]?.path).toBe("/api/v1/me");
		vi.unstubAllEnvs();
	});
});
