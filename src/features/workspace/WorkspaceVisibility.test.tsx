import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
import {
	currentUserReply,
	openApp,
	type OpenedApp,
} from "@/common/testing/openApp";
import {
	accessPassReply,
	envelope,
	stubApi,
	type StubReply,
} from "@/common/testing/stubApi";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";

const REFRESH = "POST /api/v1/public/sessions/refreshes";
const ME = "GET /api/v1/me";
const WORKSPACE = "GET /api/v1/me/workspace";
const BRANCHES = "GET /api/v1/companies/c-1/branches";
const DEPARTMENTS = "GET /api/v1/companies/c-1/departments";
const ACCESS_ROLES = "GET /api/v1/companies/c-1/access-roles";

type Unit = { uuid: string; permissions: Array<string> };

let app: OpenedApp | undefined;
beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
	app?.disconnect();
	app?.queryClient.clear();
	app = undefined;
	endSession("expired");
	resetApiClient();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	localStorage.clear();
});

const open = async (entry: string): Promise<OpenedApp> => {
	app = await openApp(entry);
	renderAuthApp(app);
	return app;
};

/** One Branch, `b-1`, holding the given Departments. */
const workspaceReply = (
	companyPermissions: Array<string>,
	branchPermissions: Array<string> = [],
	departments: Array<Unit> = []
): StubReply => ({
	status: 200,
	body: envelope({
		companies: [
			{
				uuid: "c-1",
				name: "Company c-1",
				permissions: companyPermissions,
				branches: [
					{
						uuid: "b-1",
						name: "Orchard",
						permissions: branchPermissions,
						departments: departments.map((department) => ({
							...department,
							name: department.uuid,
						})),
					},
				],
			},
		],
	}),
});

const pageReply = (content: Array<Record<string, unknown>>): StubReply => ({
	status: 200,
	body: envelope({ content, page: { totalElements: content.length } }),
});

const branch = (branchId: string, name: string): Record<string, unknown> => ({
	branchId,
	companyId: "c-1",
	name,
	code: "SG-ORC-01",
	city: "Singapore",
	country: "SG",
	status: "ACTIVE",
	headMembershipIds: [],
});

const routes = (workspace: StubReply): Record<string, StubReply> => ({
	[REFRESH]: accessPassReply(),
	[ME]: currentUserReply(),
	[WORKSPACE]: workspace,
});

const organisationLink = (): HTMLElement | null =>
	screen.queryByRole("link", { name: "Organisation" });

describe("the Organisation entry in the sidebar", () => {
	it("is not offered to a person who holds none of its read keys", async () => {
		stubApi(routes(workspaceReply(["company:read"])));
		await open("/");

		expect(
			await screen.findByRole("link", { name: "Dashboard" })
		).toBeVisible();
		expect(organisationLink()).not.toBeInTheDocument();
	});

	it("is offered when a read key is held company-wide", async () => {
		stubApi(routes(workspaceReply(["branch:read"])));
		await open("/");

		expect(
			await screen.findByRole("link", { name: "Organisation" })
		).toBeVisible();
	});

	it("is offered when a read key is held only at one Department", async () => {
		stubApi(
			routes(
				workspaceReply(
					[],
					[],
					[{ uuid: "d-1", permissions: ["department:read"] }]
				)
			)
		);
		await open("/");

		expect(
			await screen.findByRole("link", { name: "Organisation" })
		).toBeVisible();
	});
});

describe("Edit on the Branches list", () => {
	it("is enabled only for the Branch the person may update", async () => {
		stubApi({
			...routes(workspaceReply(["branch:read"], ["branch:update"])),
			[BRANCHES]: pageReply([branch("b-1", "Orchard"), branch("b-2", "Bugis")]),
		});
		await open("/organisation/branches");
		const table = await screen.findByRole("table", { name: "Branches" });

		expect(
			await within(table).findByRole("button", { name: "Edit Orchard" })
		).toBeEnabled();
		expect(
			within(table).getByRole("button", { name: "Edit Bugis" })
		).toBeDisabled();
	});

	it("is enabled for every Branch when the update key is held company-wide", async () => {
		stubApi({
			...routes(workspaceReply(["branch:read", "branch:update"])),
			[BRANCHES]: pageReply([branch("b-1", "Orchard"), branch("b-2", "Bugis")]),
		});
		await open("/organisation/branches");
		const table = await screen.findByRole("table", { name: "Branches" });

		expect(
			await within(table).findByRole("button", { name: "Edit Bugis" })
		).toBeEnabled();
	});
});

describe("Edit on the Departments list", () => {
	it("is enabled only for the Department the person may update", async () => {
		const department = (
			departmentId: string,
			name: string
		): Record<string, unknown> => ({
			departmentId,
			companyId: "c-1",
			branchId: "b-1",
			name,
			status: "ACTIVE",
			headMembershipIds: [],
		});
		stubApi({
			...routes(
				workspaceReply(
					["department:read"],
					[],
					[{ uuid: "d-1", permissions: ["department:update"] }]
				)
			),
			[DEPARTMENTS]: pageReply([
				department("d-1", "Kitchen"),
				department("d-2", "Service"),
			]),
			[BRANCHES]: pageReply([branch("b-1", "Orchard")]),
		});
		await open("/organisation/departments");
		const table = await screen.findByRole("table", { name: "Departments" });

		expect(
			await within(table).findByRole("button", { name: "Edit Kitchen" })
		).toBeEnabled();
		expect(
			within(table).getByRole("button", { name: "Edit Service" })
		).toBeDisabled();
	});
});

describe("Edit on the System Roles list", () => {
	const role = (
		accessRoleId: string,
		name: string,
		protectedRole = false
	): Record<string, unknown> => ({
		accessRoleId,
		companyId: "c-1",
		name,
		protectedRole,
		holderCount: 0,
		permissions: [],
	});

	it("needs the update key, and never edits the protected role", async () => {
		stubApi({
			...routes(workspaceReply(["access_role:read", "access_role:update"])),
			[ACCESS_ROLES]: pageReply([
				role("r-1", "Company Owner", true),
				role("r-2", "Manager"),
			]),
		});
		await open("/organisation/system-roles");
		const table = await screen.findByRole("table");

		expect(
			await within(table).findByRole("button", { name: "Edit Manager" })
		).toBeEnabled();
		expect(
			within(table).getByRole("button", { name: "Edit Company Owner" })
		).toBeDisabled();
	});

	it("is disabled for every role without the update key", async () => {
		stubApi({
			...routes(workspaceReply(["access_role:read"])),
			[ACCESS_ROLES]: pageReply([role("r-2", "Manager")]),
		});
		await open("/organisation/system-roles");
		const table = await screen.findByRole("table");

		expect(
			await within(table).findByRole("button", { name: "Edit Manager" })
		).toBeDisabled();
	});
});
