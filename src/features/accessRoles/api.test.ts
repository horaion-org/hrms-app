import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { createAccessRole } from "@/features/accessRoles/api";

beforeEach(() => {
	configureApiClient({
		accessToken: () => Promise.resolve("test-pass"),
		renew: () => Promise.resolve({ kind: "expired" }),
		onUnauthenticated: () => {},
	});
});
afterEach(() => {
	resetApiClient();
	vi.unstubAllGlobals();
});

describe("create access role client", () => {
	it("posts a trimmed name with the chosen permission keys", async () => {
		const calls = stubApi({
			"POST /api/v1/companies/c-1/access-roles": {
				status: 201,
				body: envelope({
					accessRoleId: "r-1",
					companyId: "c-1",
					name: "Branch manager",
					protectedRole: false,
					kind: "LOCAL",
					status: "ACTIVE",
					holderCount: 0,
					permissions: ["branch:read", "branch:update"],
				}),
			},
		});
		await expect(
			createAccessRole("c-1", {
				kind: "LOCAL",
				name: " Branch manager ",
				permissions: ["branch:read", "branch:update"],
			})
		).resolves.toMatchObject({
			accessRoleId: "r-1",
			protectedRole: false,
			kind: "LOCAL",
		});
		expect(calls[0]?.body).toEqual({
			kind: "LOCAL",
			name: "Branch manager",
			permissions: ["branch:read", "branch:update"],
		});
	});
});
