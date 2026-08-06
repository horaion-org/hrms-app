import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest, configureApiClient } from "@/common/api-client";
import { ApiProblemError } from "@/common/problem";

type CapturedRequest = { url: string; init: RequestInit | undefined };

let captured: Array<CapturedRequest> = [];

function stubFetch(status: number, body?: unknown): void {
	vi.stubGlobal(
		"fetch",
		(url: string, init?: RequestInit): Promise<Response> => {
			captured.push({ url, init });

			return Promise.resolve(
				new Response(body === undefined ? null : JSON.stringify(body), {
					status,
					headers: { "Content-Type": "application/json" },
				})
			);
		}
	);
}

function headersOf(request: CapturedRequest | undefined): Headers {
	return (request?.init?.headers ?? new Headers()) as Headers;
}

beforeEach(() => {
	captured = [];
});

afterEach(() => {
	vi.unstubAllGlobals();
	configureApiClient(() => Promise.resolve(null));
});

describe("apiRequest", () => {
	it("given_successEnvelope_when_requested_then_returnsOnlyTheData", async () => {
		stubFetch(200, {
			success: true,
			data: { id: "role-1" },
			message: "Role retrieved",
			timestamp: "2026-08-06T00:00:00Z",
			path: "/api/v1/companies/c/roles/r",
		});

		const result = await apiRequest<{ id: string }>("/api/v1/roles");

		expect(result).toEqual({ id: "role-1" });
	});

	it("given_noContent_when_requested_then_resolvesWithoutParsingABody", async () => {
		stubFetch(204);

		await expect(apiRequest<void>("/api/v1/roles/r")).resolves.toBeUndefined();
	});

	it("given_problemDetail_when_requested_then_throwsWithStatusAndErrorCode", async () => {
		stubFetch(403, {
			title: "Forbidden",
			status: 403,
			detail: "User 'sub' is not permitted to create Company 'c'",
			error_code: "AUTHORIZATION_DENIED",
		});

		const failure: unknown = await apiRequest("/api/v1/roles").catch(
			(error: unknown) => error
		);

		expect(failure).toBeInstanceOf(ApiProblemError);

		const problem = failure as ApiProblemError;

		expect(problem.isForbidden).toBe(true);
		expect(problem.errorCode).toBe("AUTHORIZATION_DENIED");
		expect(problem.message).toContain("not permitted");
	});

	it("given_unparseableErrorBody_when_requested_then_stillThrowsWithTheStatus", async () => {
		vi.stubGlobal("fetch", (): Promise<Response> =>
			Promise.resolve(new Response("<html>gateway</html>", { status: 502 }))
		);

		const failure: unknown = await apiRequest("/api/v1/roles").catch(
			(error: unknown) => error
		);

		expect(failure).toBeInstanceOf(ApiProblemError);
		expect((failure as ApiProblemError).status).toBe(502);
	});

	it("given_configuredToken_when_requested_then_sendsBearerAuthorization", async () => {
		stubFetch(200, { data: null });
		configureApiClient(() => Promise.resolve("token-value"));

		await apiRequest("/api/v1/me");

		expect(headersOf(captured[0]).get("Authorization")).toBe(
			"Bearer token-value"
		);
	});

	it("given_anonymousRequest_when_requested_then_omitsAuthorization", async () => {
		stubFetch(200, { data: null });
		configureApiClient(() => Promise.resolve("token-value"));

		await apiRequest("/api/v1/public/onboardings", {
			method: "POST",
			body: {},
			anonymous: true,
		});

		expect(headersOf(captured[0]).has("Authorization")).toBe(false);
	});

	it("given_aBaseUrlWithATrailingSlash_when_requested_then_doesNotDoubleTheSeparator", async () => {
		stubFetch(200, { data: null });

		await apiRequest("/api/v1/me");

		expect(captured[0]?.url).not.toContain("//api/v1");
	});
});
