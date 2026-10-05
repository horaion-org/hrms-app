import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
	problemReply,
	stubApi,
	type StubReply,
} from "@/common/testing/stubApi";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";
import { PERMISSION_KEYS } from "@/features/workspace/permissionKeys";

const ROLES = "GET /api/v1/companies/c-1/access-roles";
const CREATE = "POST /api/v1/companies/c-1/access-roles";
const LIST = "/organisation/system-roles";
const CREATOR = "/organisation/system-roles/new";

const role = (
	overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
	accessRoleId: "r-2",
	companyId: "c-1",
	name: "Manager",
	protectedRole: false,
	holderCount: 0,
	permissions: ["branch:read"],
	...overrides,
});

const rolesReply = (
	roles: Array<Record<string, unknown>> = [role()]
): StubReply => ({
	status: 200,
	body: envelope({ content: roles, page: { totalElements: roles.length } }),
});

const routes = (
	held: ReadonlyArray<string> = PERMISSION_KEYS
): Record<string, StubReply> => ({
	"POST /api/v1/public/sessions/refreshes": accessPassReply(),
	"GET /api/v1/me": currentUserReply(),
	"GET /api/v1/me/workspace": {
		status: 200,
		body: envelope({
			companies: [
				{ uuid: "c-1", name: "Company c-1", permissions: held, branches: [] },
			],
		}),
	},
	[ROLES]: rolesReply(),
	[CREATE]: {
		status: 201,
		body: envelope(role({ accessRoleId: "r-3", name: "Supervisor" })),
	},
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

const open = async (entry: string): Promise<OpenedApp> => {
	app = await openApp(entry);
	renderAuthApp(app);
	return app;
};

const box = (group: string, name: string): HTMLElement =>
	within(screen.getByRole("group", { name: group })).getByRole("checkbox", {
		name,
	});
const create = (): HTMLElement =>
	screen.getByRole("button", { name: "Create role" });

/** Names the role, gives it Branches > Edit and submits it. */
const fillIn = async (name: string): Promise<void> => {
	const user = userEvent.setup();
	await user.type(
		await screen.findByRole("textbox", { name: /Role name/ }),
		name
	);
	await user.click(box("Branches", "Edit"));
	await user.click(create());
};

describe("Create system role", () => {
	it("opens an empty creation dialog from the list", async () => {
		const user = userEvent.setup();
		stubApi(routes());
		const opened = await open(LIST);

		await user.click(
			await screen.findByRole("button", { name: "Create system role" })
		);

		const dialog = await screen.findByRole("dialog", {
			name: "Create system role",
		});
		expect(dialog).toBeVisible();
		expect(opened.router.state.location.pathname).toBe(LIST);
		expect(
			within(dialog).getByRole("textbox", { name: /Role name/ })
		).toHaveValue("");
		for (const item of within(dialog).getAllByRole("checkbox"))
			expect(item).not.toBeChecked();
		expect(
			within(dialog).getByText("Choose at least 1 permission.")
		).toBeVisible();
		expect(screen.queryByText(/unavailable/)).not.toBeInTheDocument();
	});

	it("offers no Create Role button without permission to create roles", async () => {
		stubApi(routes(["access_role:read", "access_role:update"]));
		await open(LIST);

		await screen.findByRole("button", { name: "Edit Manager" });
		expect(
			screen.queryByRole("button", { name: "Create system role" })
		).not.toBeInTheDocument();
	});

	it("creates the role with the trimmed name and ticked permissions, then lists it", async () => {
		const calls = stubApi({
			...routes(),
			[ROLES]: [
				rolesReply(),
				rolesReply([role(), role({ accessRoleId: "r-3", name: "Supervisor" })]),
			],
		});

		await open(LIST);
		await screen.findByText("Manager");
		await app?.router.navigate({ to: CREATOR });
		await fillIn("  Supervisor ");

		expect(
			await screen.findByRole("heading", { level: 1, name: "System roles" })
		).toBeVisible();
		expect(app?.router.state.location.pathname).toBe(LIST);
		expect(
			calls
				.filter((call) => `${call.method} ${call.path}` === CREATE)
				.map((call) => call.body)
		).toEqual([
			{ name: "Supervisor", permissions: ["branch:read", "branch:update"] },
		]);
		expect(await screen.findByText("Supervisor")).toBeVisible();
	});

	it("shows a taken name on the name field and stays on the page", async () => {
		stubApi({
			...routes(),
			[CREATE]: problemReply(409, "ACCESS_ROLE_NAME_CONFLICT"),
		});

		await open(CREATOR);
		await fillIn("Manager");

		expect(
			await screen.findByText(
				'A role named "Manager" already exists. Choose a different name.'
			)
		).toBeVisible();
		const name = screen.getByRole("textbox", { name: /Role name/ });
		expect(name).toHaveFocus();
		expect(name).toHaveValue("Manager");
		expect(app?.router.state.location.pathname).toBe(CREATOR);
		expect(screen.queryByText(/API says/)).not.toBeInTheDocument();
	});

	it("explains a create the API refuses for permissions the person doesn't hold", async () => {
		stubApi({
			...routes(),
			[CREATE]: problemReply(403, "AUTHORIZATION_DENIED"),
		});

		await open(CREATOR);
		await fillIn("Supervisor");

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"This role includes permissions you don’t hold, or you can no longer change system roles."
		);
		expect(screen.queryByText(/API says/)).not.toBeInTheDocument();
		expect(box("Branches", "Edit")).toBeChecked();
		expect(app?.router.state.location.pathname).toBe(CREATOR);
	});

	it("offers only the permissions the person holds at the company", async () => {
		const user = userEvent.setup();
		stubApi(
			routes(["access_role:read", "access_role:create", "branch:update"])
		);
		await open(CREATOR);
		await screen.findByRole("textbox", { name: /Role name/ });

		expect(
			screen.getByText(
				"You can only give a role permissions you hold yourself, so the others are unavailable."
			)
		).toBeVisible();
		expect(box("Branches", "View")).toBeDisabled();
		expect(box("Branches", "Create")).toBeDisabled();
		expect(box("Branches", "Edit")).toBeEnabled();
		expect(box("Departments", "Departments")).toBeDisabled();

		// Neither the row's select-all nor the automatic View adds what isn't held.
		await user.click(box("Branches", "Branches"));
		expect(box("Branches", "Edit")).toBeChecked();
		expect(box("Branches", "View")).not.toBeChecked();
		expect(box("Branches", "Create")).not.toBeChecked();
		await user.click(box("Branches", "Branches"));
		await user.click(box("Branches", "Edit"));
		expect(box("Branches", "View")).not.toBeChecked();
	});

	it("says so instead of showing the form without permission to create roles", async () => {
		stubApi(routes(["access_role:read"]));
		await open(CREATOR);

		expect(
			await screen.findByText(
				"You don’t have permission to create system roles."
			)
		).toBeVisible();
		expect(
			screen.queryByRole("textbox", { name: /Role name/ })
		).not.toBeInTheDocument();
		expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
	});
});
