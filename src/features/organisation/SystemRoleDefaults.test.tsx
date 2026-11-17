import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
import { companyWideWorkspace } from "@/common/testing/effectiveWorkspace";
import {
	currentUserReply,
	openApp,
	type OpenedApp,
} from "@/common/testing/openApp";
import {
	accessPassReply,
	envelope,
	problemReply,
	stubApi,
	type StubReply,
} from "@/common/testing/stubApi";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";
import { PERMISSION_KEYS } from "@/features/workspace/permissionKeys";

const DEFAULTS = "/api/v1/companies/c-1/default-access-rules";

const role = (accessRoleId: string, name: string): Record<string, unknown> => ({
	accessRoleId,
	companyId: "c-1",
	name,
	protectedRole: false,
	kind: "LOCAL",
	status: "ACTIVE",
	permissions: ["schedule:read"],
	holderCount: 0,
});

// The worked example on the test workspace: Staff for the company, Leave calendar for Orchard
// (its whole branch), Availability viewer for Orchard › Kitchen.
const RULES = [
	{
		defaultAccessRuleId: "x",
		accessRoleId: "r-staff",
		setAt: "COMPANY",
		branchId: null,
		departmentId: null,
		appliesTo: "OWN_DEPARTMENT",
	},
	{
		defaultAccessRuleId: "y",
		accessRoleId: "r-leave",
		setAt: "BRANCH",
		branchId: "b-1",
		departmentId: null,
		appliesTo: "OWN_BRANCH",
	},
	{
		defaultAccessRuleId: "z",
		accessRoleId: "r-availability",
		setAt: "DEPARTMENT",
		branchId: null,
		departmentId: "d-1",
		appliesTo: "OWN_DEPARTMENT",
	},
];

const routes = (
	held: ReadonlyArray<string> = PERMISSION_KEYS,
	rules: ReadonlyArray<Record<string, unknown>> = RULES
): Record<string, StubReply | Array<StubReply>> => ({
	"POST /api/v1/public/sessions/refreshes": accessPassReply(),
	"GET /api/v1/me": currentUserReply(),
	"GET /api/v1/me/workspace": {
		status: 200,
		body: envelope(companyWideWorkspace(held)),
	},
	"GET /api/v1/companies/c-1/access-roles": {
		status: 200,
		body: envelope({
			content: [
				role("r-availability", "Availability viewer"),
				role("r-leave", "Leave calendar"),
				role("r-staff", "Staff"),
			],
			page: { totalElements: 3 },
		}),
	},
	[`GET ${DEFAULTS}`]: { status: 200, body: envelope(rules) },
});

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

const open = async (): Promise<HTMLElement> => {
	app = await openApp("/settings/access-roles");
	renderAuthApp(app);
	return screen.findByRole("table", { name: "Default access" });
};

const rowTexts = (table: HTMLElement): Array<string> =>
	within(table)
		.getAllByRole("row")
		.slice(1)
		.map((row) => row.textContent ?? "");

describe("Default access on Settings › Access roles", () => {
	it("lists one row per default with whose people it covers and where it applies", async () => {
		stubApi(routes());
		const table = await open();

		await waitFor(() => {
			expect(rowTexts(table)).toEqual([
				expect.stringContaining("Staff"),
				expect.stringContaining("Leave calendar"),
				expect.stringContaining("Availability viewer"),
			]);
		});
		const [company, branch, department] = rowTexts(table);
		expect(company).toContain("Everyone in the company");
		expect(company).toContain("Their own department");
		expect(branch).toContain("Everyone in Orchard");
		expect(branch).toContain("Their own branch");
		expect(department).toContain("Everyone in Orchard › Kitchen");
	});

	it("says people see only their own things while there is no default", async () => {
		stubApi(routes(PERMISSION_KEYS, []));
		const table = await open();

		expect(
			await within(table).findByText(
				"No default access yet. People see only their own things until they are given a role."
			)
		).toBeVisible();
	});

	it("shows the list without Remove to a reader who can't change access", async () => {
		stubApi(
			routes(PERMISSION_KEYS.filter((key) => key !== "access_role:assign"))
		);
		const table = await open();

		await within(table).findByText("Leave calendar");
		expect(
			within(table).queryByRole("button", { name: /^Remove/ })
		).not.toBeInTheDocument();
	});

	it("leaves the section out for a reader who can't read access roles company-wide", async () => {
		const calls = stubApi(
			routes(
				PERMISSION_KEYS.filter(
					(key) => key !== "access_role:read" && key !== "access_role:assign"
				)
			)
		);
		app = await openApp("/settings/access-roles");
		renderAuthApp(app);

		await screen.findByRole("heading", { name: "Access roles" });
		expect(
			screen.queryByRole("heading", { name: "Default access" })
		).not.toBeInTheDocument();
		expect(calls.some((call) => call.path === DEFAULTS)).toBe(false);
	});

	it("removes a default after asking, and the list reloads", async () => {
		const calls = stubApi({
			...routes(),
			[`GET ${DEFAULTS}`]: [
				{ status: 200, body: envelope(RULES) },
				{ status: 200, body: envelope(RULES.slice(0, 2)) },
			],
			[`DELETE ${DEFAULTS}/z`]: { status: 204 },
		});
		const table = await open();
		await userEvent.click(
			await within(table).findByRole("button", {
				name: "Remove Availability viewer for Everyone in Orchard › Kitchen",
			})
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Remove Availability viewer as default access for Everyone in Orchard › Kitchen?",
		});

		expect(calls.some((call) => call.method === "DELETE")).toBe(false);
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Remove" })
		);

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		expect(calls.filter((call) => call.method === "DELETE")).toHaveLength(1);
		await waitFor(() => {
			expect(
				within(table).queryByText("Availability viewer")
			).not.toBeInTheDocument();
		});
	});

	it("explains a refused removal in the app's words", async () => {
		stubApi({
			...routes(),
			[`DELETE ${DEFAULTS}/x`]: problemReply(403, "AUTHORIZATION_DENIED"),
		});
		const table = await open();
		await userEvent.click(
			await within(table).findByRole("button", {
				name: "Remove Staff for Everyone in the company",
			})
		);
		const dialog = await screen.findByRole("dialog");
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Remove" })
		);

		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			"Only the System Owner or a System Admin can change default access."
		);
	});
});
