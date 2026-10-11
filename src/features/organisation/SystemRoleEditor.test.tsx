import { screen, waitFor, within } from "@testing-library/react";
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

const WORKSPACE = "GET /api/v1/me/workspace";
const ROLES = "GET /api/v1/companies/c-1/access-roles";
const ROLE = "GET /api/v1/companies/c-1/access-roles/r-2";
const HOLDERS =
	"GET /api/v1/companies/c-1/access-roles/r-2/access-role-assignments";
const SAVE = "PUT /api/v1/companies/c-1/access-roles/r-2";
const ROLE_PAGE = "/organisation/system-roles/r-2";
const EDITOR = `${ROLE_PAGE}?tab=permissions`;

const role = (
	overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
	accessRoleId: "r-2",
	companyId: "c-1",
	name: "Manager",
	protectedRole: false,
	status: "ACTIVE",
	permissions: ["branch:read", "branch:create", "department:read"],
	holderCount: 0,
	...overrides,
});

const roleReply = (overrides: Record<string, unknown> = {}): StubReply => ({
	status: 200,
	body: envelope(role(overrides)),
});

const routes = (
	held: ReadonlyArray<string> = PERMISSION_KEYS
): Record<string, StubReply> => ({
	"POST /api/v1/public/sessions/refreshes": accessPassReply(),
	"GET /api/v1/me": currentUserReply(),
	[WORKSPACE]: {
		status: 200,
		body: envelope({
			companies: [
				{ uuid: "c-1", name: "Company c-1", permissions: held, branches: [] },
			],
		}),
	},
	[ROLES]: {
		status: 200,
		body: envelope({ content: [role()], page: { totalElements: 1 } }),
	},
	[ROLE]: roleReply(),
	[HOLDERS]: { status: 200, body: envelope([]) },
	[SAVE]: roleReply(),
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
const save = (): HTMLElement =>
	screen.getByRole("button", { name: "Save changes" });

describe("System role editor", () => {
	it("opens on the role's permissions from the list's Edit button", async () => {
		const user = userEvent.setup();
		stubApi(routes());
		const opened = await open("/organisation/system-roles");

		await user.click(
			await screen.findByRole("button", { name: "Edit Manager" })
		);

		await waitFor(() => {
			expect(opened.router.state.location.href).toBe(EDITOR);
		});
	});

	it("shows the role as it is, with nothing to save yet", async () => {
		stubApi(routes());
		await open(EDITOR);

		expect(
			await screen.findByRole("heading", { level: 1, name: "Manager" })
		).toBeVisible();
		expect(screen.getByRole("textbox", { name: /Role name/ })).toHaveValue(
			"Manager"
		);
		expect(box("Branches", "View")).toBeChecked();
		expect(box("Branches", "Create")).toBeChecked();
		expect(box("Branches", "Edit")).not.toBeChecked();
		expect(box("Departments", "View")).toBeChecked();
		expect(
			screen.getByText(`3 of ${PERMISSION_KEYS.length} selected`)
		).toBeVisible();
		expect(save()).toBeDisabled();
		expect(
			screen.getByRole("button", { name: "Discard changes" })
		).toBeDisabled();
	});

	it("saves the name and the whole permission set, then returns to the list", async () => {
		const user = userEvent.setup();
		const calls = stubApi(routes());
		const opened = await open(EDITOR);
		const name = await screen.findByRole("textbox", { name: /Role name/ });

		await user.clear(name);
		await user.type(name, "  Area manager ");
		await user.click(box("Departments", "Edit"));
		await user.click(box("Branches", "Create"));

		expect(screen.getByText("1 added, 1 removed")).toBeVisible();
		await user.click(save());

		expect(
			await screen.findByRole("heading", { level: 1, name: "System roles" })
		).toBeVisible();
		expect(opened.router.state.location.pathname).toBe(
			"/organisation/system-roles"
		);
		expect(
			calls.filter((call) => call.method === "PUT").map((call) => call.body)
		).toEqual([
			{
				name: "Area manager",
				permissions: ["branch:read", "department:read", "department:update"],
				status: "ACTIVE",
			},
		]);
		// The role may be one the person holds, so the workspace is asked again.
		await waitFor(() => {
			expect(
				calls.filter((call) => call.path === "/api/v1/me/workspace")
			).toHaveLength(2);
		});
	});

	it("puts back what was loaded when changes are discarded", async () => {
		const user = userEvent.setup();
		const calls = stubApi(routes());
		await open(EDITOR);
		const name = await screen.findByRole("textbox", { name: /Role name/ });

		await user.type(name, " two");
		await user.click(box("Branches", "View"));
		expect(screen.getByText("2 removed")).toBeVisible();
		await user.click(screen.getByRole("button", { name: "Discard changes" }));

		expect(name).toHaveValue("Manager");
		expect(box("Branches", "Create")).toBeChecked();
		expect(save()).toBeDisabled();
		expect(calls.some((call) => call.method === "PUT")).toBe(false);
	});

	it("won't save a role with no permissions and says why", async () => {
		const user = userEvent.setup();
		stubApi(routes());
		await open(EDITOR);
		await screen.findByRole("textbox", { name: /Role name/ });

		await user.click(box("Branches", "View"));
		await user.click(box("Departments", "View"));

		expect(screen.getByText("Choose at least one permission.")).toBeVisible();
		expect(save()).toBeDisabled();
	});

	it("checks the name before asking the API", async () => {
		const user = userEvent.setup();
		const calls = stubApi(routes());
		await open(EDITOR);
		const name = await screen.findByRole("textbox", { name: /Role name/ });

		await user.clear(name);
		await user.type(name, "M");
		await user.click(save());

		expect(await screen.findByText("Use 2 to 100 characters.")).toBeVisible();
		expect(calls.some((call) => call.method === "PUT")).toBe(false);
	});

	it("shows a taken name on the name field and keeps the changes", async () => {
		const user = userEvent.setup();
		stubApi({
			...routes(),
			[SAVE]: problemReply(409, "ACCESS_ROLE_NAME_CONFLICT"),
		});
		const opened = await open(EDITOR);
		const name = await screen.findByRole("textbox", { name: /Role name/ });

		await user.clear(name);
		await user.type(name, "Staff");
		await user.click(save());

		expect(
			await screen.findByText(
				'A role named "Staff" already exists. Choose a different name.'
			)
		).toBeVisible();
		expect(name).toHaveFocus();
		expect(name).toHaveValue("Staff");
		expect(opened.router.state.location.pathname).toBe(ROLE_PAGE);
		expect(screen.queryByText(/API says/)).not.toBeInTheDocument();
	});

	it("explains a save the API refuses for permissions the person doesn't hold", async () => {
		const user = userEvent.setup();
		stubApi({ ...routes(), [SAVE]: problemReply(403, "AUTHORIZATION_DENIED") });
		await open(EDITOR);
		await screen.findByRole("textbox", { name: /Role name/ });

		await user.click(box("Branches", "Edit"));
		await user.click(save());

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"This role includes permissions you don’t hold, or you can no longer change system roles."
		);
		expect(box("Branches", "Edit")).toBeChecked();
	});

	it("shows a permission this app's catalog doesn't know as locked and saves it back untouched", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...routes([...PERMISSION_KEYS, "leave:approve"]),
			[ROLE]: roleReply({ permissions: ["branch:read", "leave:approve"] }),
		});
		await open(EDITOR);
		await screen.findByRole("textbox", { name: /Role name/ });

		expect(
			screen.getByText(
				"This role has a permission this version of the app doesn’t recognise. It is kept as it is when you save. Reload the page to update the app and change it."
			)
		).toBeVisible();
		const unknown = box("Not recognised", "leave:approve");
		expect(unknown).toBeChecked();
		expect(unknown).toBeDisabled();

		await user.click(box("Branches", "Edit"));
		await user.click(save());

		await waitFor(() => {
			expect(
				calls.filter((call) => call.method === "PUT").map((call) => call.body)
			).toEqual([
				{
					name: "Manager",
					permissions: ["branch:read", "branch:update", "leave:approve"],
					status: "ACTIVE",
				},
			]);
		});
	});
});

describe("System role editor, read-only", () => {
	const expectReadOnly = (): void => {
		expect(screen.getByRole("textbox", { name: /Role name/ })).toBeDisabled();
		for (const item of screen.getAllByRole("checkbox"))
			expect(item).toBeDisabled();
		expect(
			screen.queryByRole("button", { name: "Save changes" })
		).not.toBeInTheDocument();
	};

	it("shows the Company Owner role with every permission and no way to change it", async () => {
		const user = userEvent.setup();
		stubApi({
			...routes(),
			[ROLES]: {
				status: 200,
				body: envelope({
					content: [
						role({
							name: "Company Owner",
							protectedRole: true,
							status: "ACTIVE",
							permissions: PERMISSION_KEYS,
						}),
					],
					page: { totalElements: 1 },
				}),
			},
			[ROLE]: roleReply({
				name: "Company Owner",
				protectedRole: true,
				status: "ACTIVE",
				permissions: PERMISSION_KEYS,
			}),
		});
		await open("/organisation/system-roles");

		await user.click(
			await screen.findByRole("button", {
				name: "More actions for Company Owner",
			})
		);
		// View opens the role on who has it; its permissions are one tab over.
		await user.click(await screen.findByRole("menuitem", { name: "View" }));
		await user.click(await screen.findByRole("tab", { name: "Permissions" }));

		expect(
			await screen.findByText(
				"The Company Owner role always has every permission and can’t be changed."
			)
		).toBeVisible();
		expectReadOnly();
		expect(screen.getByText("Full access")).toBeVisible();
		for (const item of screen.getAllByRole("checkbox"))
			expect(item).toBeChecked();
	});

	it("shows a role holding a permission the person doesn't, since the API would refuse any change", async () => {
		stubApi(routes(["access_role:read", "access_role:update", "branch:read"]));
		await open(EDITOR);

		expect(
			await screen.findByText(
				"This role includes permissions you don’t hold, so you can’t change it."
			)
		).toBeVisible();
		expectReadOnly();
	});

	it("shows the role to someone who may read roles but not change them", async () => {
		stubApi(routes(["access_role:read"]));
		await open(EDITOR);

		expect(
			await screen.findByText(
				"You don’t have permission to change system roles."
			)
		).toBeVisible();
		expectReadOnly();
	});
});

describe("System role editor, role not loaded", () => {
	it.each([
		[
			problemReply(404, "ACCESS_ROLE_NOT_FOUND"),
			"This role doesn’t exist or has been deleted.",
		],
		[
			problemReply(403, "AUTHORIZATION_DENIED"),
			"You don’t have permission to view this role.",
		],
		[
			problemReply(500, "INTERNAL_ERROR"),
			"We couldn’t load this role. Please try again.",
		],
	])("says why and offers the way back", async (reply, message) => {
		stubApi({ ...routes(), [ROLE]: reply });
		await open(EDITOR);

		expect(await screen.findByRole("alert")).toHaveTextContent(message);
		expect(screen.getByRole("link", { name: "System roles" })).toHaveAttribute(
			"href",
			"/organisation/system-roles"
		);
	});
});
