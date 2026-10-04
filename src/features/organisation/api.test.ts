import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { ApiProblemError, UnexpectedResponseError } from "@/common/problem";
import { envelope, problemReply, stubApi } from "@/common/testing/stubApi";
import {
	createBranch,
	searchCompanyMembers,
} from "@/features/organisation/api";

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

describe("create branch client", () => {
	it("posts a trimmed name and chosen company membership ids and parses the branch", async () => {
		const calls = stubApi({
			"POST /api/v1/companies/c-1/branches": {
				status: 201,
				body: envelope({
					branchId: "b-1",
					name: "Orchard Road",
					status: "ACTIVE",
				}),
			},
		});
		await expect(
			createBranch("c-1", {
				name: "  Orchard Road  ",
				initialHeadCompanyMembershipIds: ["m-1"],
			})
		).resolves.toEqual({
			branchId: "b-1",
			name: "Orchard Road",
			status: "ACTIVE",
		});
		expect(calls[0]?.body).toEqual({
			name: "Orchard Road",
			initialHeadCompanyMembershipIds: ["m-1"],
		});
	});

	it("rejects malformed success data instead of trusting its type", async () => {
		stubApi({
			"POST /api/v1/companies/c-1/branches": {
				status: 201,
				body: envelope({ branchId: "b-1", name: "Orchard", status: "UNKNOWN" }),
			},
		});
		await expect(
			createBranch("c-1", {
				name: "Orchard",
				initialHeadCompanyMembershipIds: ["m-1"],
			})
		).rejects.toBeInstanceOf(UnexpectedResponseError);
	});

	it("preserves a typed refusal", async () => {
		stubApi({
			"POST /api/v1/companies/c-1/branches": problemReply(
				409,
				"BRANCH_NAME_CONFLICT"
			),
		});
		await expect(
			createBranch("c-1", {
				name: "Orchard",
				initialHeadCompanyMembershipIds: ["m-1"],
			})
		).rejects.toBeInstanceOf(ApiProblemError);
	});
});

describe("company member search", () => {
	it("uses active, twenty, display-name sort and trimmed search with a parsed page", async () => {
		const member = {
			membershipId: "m-1",
			displayName: "Marcus",
			status: "ACTIVE",
		};
		const calls = stubApi({
			"GET /api/v1/companies/c-1/members": {
				status: 200,
				body: envelope({ content: [member], page: { totalElements: 25 } }),
			},
		});
		await expect(
			searchCompanyMembers("c-1", {
				search: "  Marc  ",
				status: "ACTIVE",
				size: 20,
			})
		).resolves.toEqual({ items: [member], total: 25 });
		const query = new URLSearchParams(calls[0]?.search);
		expect(Object.fromEntries(query)).toEqual({
			search: "Marc",
			status: "ACTIVE",
			size: "20",
			sort: "user.displayName",
		});
	});
	it("omits blank search rather than requesting whitespace", async () => {
		const calls = stubApi({
			"GET /api/v1/companies/c-1/members": {
				status: 200,
				body: envelope({ content: [], page: { totalElements: 0 } }),
			},
		});
		await searchCompanyMembers("c-1", {
			search: "  ",
			status: "ACTIVE",
			size: 20,
		});
		expect(new URLSearchParams(calls[0]?.search).has("search")).toBe(false);
	});
	it("rejects malformed external membership data", async () => {
		stubApi({
			"GET /api/v1/companies/c-1/members": {
				status: 200,
				body: envelope({
					content: [{ membershipId: "m-1", displayName: 42, status: "ACTIVE" }],
					page: { totalElements: 1 },
				}),
			},
		});
		await expect(
			searchCompanyMembers("c-1", { search: "", status: "ACTIVE", size: 20 })
		).rejects.toBeInstanceOf(UnexpectedResponseError);
	});
});
