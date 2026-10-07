import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { ApiProblemError, UnexpectedResponseError } from "@/common/problem";
import { envelope, problemReply, stubApi } from "@/common/testing/stubApi";
import {
	createAccessRole,
	createBranch,
	createDepartment,
	createJobTitle,
	fetchJobTitles,
	updateJobTitle,
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
					code: "ORC",
					city: "Singapore",
					country: "SG",
					status: "ACTIVE",
				}),
			},
		});
		await expect(
			createBranch("c-1", {
				name: "  Orchard Road  ",
				code: "  orc  ",
				city: "Singapore",
				country: "SG",
				initialHeadCompanyMembershipIds: ["m-1"],
			})
		).resolves.toEqual({
			branchId: "b-1",
			name: "Orchard Road",
			code: "ORC",
			city: "Singapore",
			country: "SG",
			status: "ACTIVE",
		});
		expect(calls[0]?.body).toEqual({
			name: "Orchard Road",
			code: "ORC",
			city: "Singapore",
			country: "SG",
			initialHeadCompanyMembershipIds: ["m-1"],
		});
	});

	it("rejects malformed success data instead of trusting its type", async () => {
		stubApi({
			"POST /api/v1/companies/c-1/branches": {
				status: 201,
				body: envelope({
					branchId: "b-1",
					name: "Orchard",
					code: "ORC",
					city: "Singapore",
					country: "SG",
					status: "UNKNOWN",
				}),
			},
		});
		await expect(
			createBranch("c-1", {
				name: "Orchard",
				code: "ORC",
				city: "Singapore",
				country: "SG",
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
				code: "ORC",
				city: "Singapore",
				country: "SG",
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
			"GET /api/v1/companies/c-1/me/colleagues": {
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
			"GET /api/v1/companies/c-1/me/colleagues": {
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
			"GET /api/v1/companies/c-1/me/colleagues": {
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

describe("create department client", () => {
	it("posts a trimmed name and heads under the chosen branch", async () => {
		const department = {
			departmentId: "d-1",
			branchId: "b-1",
			companyId: "c-1",
			name: "Front of house",
			status: "ACTIVE",
			headMembershipIds: ["m-1"],
		};
		const calls = stubApi({
			"POST /api/v1/companies/c-1/branches/b-1/departments": {
				status: 201,
				body: envelope(department),
			},
		});
		await expect(
			createDepartment("c-1", "b-1", {
				name: "  Front of house ",
				initialHeadCompanyMembershipIds: ["m-1"],
			})
		).resolves.toEqual({
			departmentId: "d-1",
			branchId: "b-1",
			name: "Front of house",
			status: "ACTIVE",
		});
		expect(calls[0]?.body).toEqual({
			name: "Front of house",
			initialHeadCompanyMembershipIds: ["m-1"],
		});
	});
});

describe("job title clients", () => {
	const jobTitle = {
		jobTitleId: "j-1",
		companyId: "c-1",
		branchId: "b-1",
		branchName: "Orchard",
		departmentId: "d-1",
		departmentName: "Kitchen",
		name: "Shift supervisor",
		status: "ACTIVE",
	};
	const parsed = {
		jobTitleId: "j-1",
		branchId: "b-1",
		branchName: "Orchard",
		departmentId: "d-1",
		departmentName: "Kitchen",
		name: "Shift supervisor",
		status: "ACTIVE",
	};
	const TITLES =
		"/api/v1/companies/c-1/branches/b-1/departments/d-1/job-titles";
	it("posts only a trimmed name under the department and parses the job title", async () => {
		const calls = stubApi({
			[`POST ${TITLES}`]: { status: 201, body: envelope(jobTitle) },
		});
		await expect(
			createJobTitle("c-1", "b-1", "d-1", { name: " Shift supervisor " })
		).resolves.toEqual(parsed);
		expect(calls[0]?.body).toEqual({ name: "Shift supervisor" });
	});
	it("puts the trimmed name and status under the department", async () => {
		const calls = stubApi({
			[`PUT ${TITLES}/j-1`]: { status: 200, body: envelope(jobTitle) },
		});
		await expect(
			updateJobTitle("c-1", {
				...parsed,
				name: " Shift supervisor ",
				status: "INACTIVE",
			})
		).resolves.toEqual(parsed);
		expect(calls[0]?.body).toEqual({
			name: "Shift supervisor",
			status: "INACTIVE",
		});
	});
	it("lists with the server sort and status filter", async () => {
		const calls = stubApi({
			"GET /api/v1/companies/c-1/job-titles": {
				status: 200,
				body: envelope({ content: [jobTitle], page: { totalElements: 3 } }),
			},
		});
		await expect(
			fetchJobTitles("c-1", {
				sort: { field: "status", desc: true },
				status: "ACTIVE",
			})
		).resolves.toEqual({ items: [parsed], total: 3 });
		expect(Object.fromEntries(new URLSearchParams(calls[0]?.search))).toEqual({
			size: "100",
			sort: "status,desc",
			status: "ACTIVE",
		});
	});
	it("lists one department's titles when asked", async () => {
		const calls = stubApi({
			"GET /api/v1/companies/c-1/job-titles": {
				status: 200,
				body: envelope({ content: [jobTitle], page: { totalElements: 1 } }),
			},
		});
		await fetchJobTitles("c-1", {
			sort: { field: "name", desc: false },
			status: "ACTIVE",
			departmentId: "d-1",
		});
		expect(Object.fromEntries(new URLSearchParams(calls[0]?.search))).toEqual({
			size: "100",
			sort: "name,asc",
			status: "ACTIVE",
			departmentId: "d-1",
		});
	});
	it("preserves a typed name conflict", async () => {
		stubApi({
			[`POST ${TITLES}`]: problemReply(409, "JOB_TITLE_NAME_CONFLICT"),
		});
		await expect(
			createJobTitle("c-1", "b-1", "d-1", { name: "Manager" })
		).rejects.toMatchObject({
			status: 409,
			errorCode: "JOB_TITLE_NAME_CONFLICT",
		});
	});
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
					status: "ACTIVE",
					holderCount: 0,
					permissions: ["branch:read", "branch:update"],
				}),
			},
		});
		await expect(
			createAccessRole("c-1", {
				name: " Branch manager ",
				permissions: ["branch:read", "branch:update"],
			})
		).resolves.toMatchObject({ accessRoleId: "r-1", protectedRole: false });
		expect(calls[0]?.body).toEqual({
			name: "Branch manager",
			permissions: ["branch:read", "branch:update"],
		});
	});
});
