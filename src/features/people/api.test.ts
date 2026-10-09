import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { UnexpectedResponseError } from "@/common/problem";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { fetchPeople, peoplePath } from "@/features/people/api";

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

const person = {
	membershipId: "m-1",
	employeeCode: "EMP-10482",
	displayName: "Moses Lee",
	email: "moses.lee@company.com",
	phone: null,
	branchId: null,
	branchName: null,
	departmentId: null,
	departmentName: null,
	jobTitleId: null,
	jobTitleName: null,
	status: "ACTIVE",
};

describe("people list client", () => {
	it("asks for a 0-based page of 10 with the sort, and nothing else by default", () => {
		expect(
			peoplePath("c-1", {
				page: 1,
				sort: { field: "displayName", desc: false },
				search: "",
			})
		).toBe(
			"/api/v1/companies/c-1/member-profiles?page=0&size=10&sort=displayName%2Casc"
		);
	});

	it("adds the status, a trimmed search cut to 100 characters and the Branch", () => {
		const path = peoplePath("c-1", {
			page: 3,
			sort: { field: "jobTitle", desc: true },
			status: "INACTIVE",
			search: `  ${"a".repeat(120)}  `,
			branchId: "b-1",
		});
		const query = new URLSearchParams(path.split("?")[1]);

		expect(Object.fromEntries(query)).toEqual({
			page: "2",
			size: "10",
			sort: "jobTitle,desc",
			status: "INACTIVE",
			search: "a".repeat(100),
			branchId: "b-1",
		});
	});

	it("reads the page's people and how many match in all", async () => {
		stubApi({
			"GET /api/v1/companies/c-1/member-profiles": {
				status: 200,
				body: envelope({
					content: [{ ...person, phone: "+6591234821" }],
					page: { size: 10, number: 0, totalElements: 160, totalPages: 16 },
				}),
			},
		});

		await expect(
			fetchPeople("c-1", {
				page: 1,
				sort: { field: "displayName", desc: false },
				search: "",
			})
		).resolves.toEqual({
			items: [{ ...person, phone: "+6591234821" }],
			total: 160,
		});
	});

	it("refuses a row with a status it does not know", async () => {
		stubApi({
			"GET /api/v1/companies/c-1/member-profiles": {
				status: 200,
				body: envelope({
					content: [{ ...person, status: "PENDING" }],
					page: { totalElements: 1 },
				}),
			},
		});

		await expect(
			fetchPeople("c-1", {
				page: 1,
				sort: { field: "displayName", desc: false },
				search: "",
			})
		).rejects.toBeInstanceOf(UnexpectedResponseError);
	});
});
