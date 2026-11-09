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

const ACCESS_ROLES = "GET /api/v1/companies/c-1/access-roles";
const CREATE = "POST /api/v1/companies/c-1/access-roles";
const role = {
	accessRoleId: "r-1",
	companyId: "c-1",
	name: "Branch manager",
	protectedRole: false,
	kind: "LOCAL",
	status: "ACTIVE",
	holderCount: 0,
	permissions: ["branch:read", "branch:update"],
};
const page = (content: Array<unknown>): StubReply => ({
	status: 200,
	body: envelope({ content, page: { totalElements: content.length } }),
});
const routes = (grants: Array<string>): Record<string, StubReply> => ({
	"POST /api/v1/public/sessions/refreshes": accessPassReply(),
	"GET /api/v1/me": currentUserReply(),
	"GET /api/v1/me/workspace": {
		status: 200,
		body: envelope({
			companies: [
				{ uuid: "c-1", name: "Company c-1", permissions: grants, branches: [] },
			],
		}),
	},
	[ACCESS_ROLES]: page([]),
	[CREATE]: { status: 201, body: envelope(role) },
});
const owner = [...PERMISSION_KEYS];
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
const open = async (): Promise<void> => {
	app = await openApp("/settings/access-roles");
	renderAuthApp(app);
	await screen.findByRole("heading", { name: "Access roles", level: 1 });
};
const openDialog = async (): Promise<HTMLElement> => {
	await userEvent.click(
		await screen.findByRole("button", { name: "Create access role" })
	);
	return screen.findByRole("dialog", { name: "Create access role" });
};
const box = (dialog: HTMLElement, group: string, name: string): HTMLElement =>
	within(within(dialog).getByRole("group", { name: group })).getByRole(
		"checkbox",
		{ name }
	);
const submit = (dialog: HTMLElement): Promise<void> =>
	userEvent.click(
		within(dialog).getByRole("button", { name: "Create access role" })
	);
const typeField = (dialog: HTMLElement): HTMLElement =>
	within(dialog).getByRole("radiogroup", {
		name: "Where can this role be used?",
	});
const chooseType = async (
	dialog: HTMLElement,
	type: "Across the whole company" | "In the branches or departments you choose"
): Promise<void> => {
	await userEvent.click(
		within(typeField(dialog)).getByRole("radio", { name: type })
	);
};

describe("create access role through the Access roles page", () => {
	it("hides create without access_role:create", async () => {
		stubApi(routes(["access_role:read"]));
		await open();
		expect(
			await screen.findByRole("table", { name: "Access roles" })
		).toBeVisible();
		expect(
			screen.queryByRole("button", { name: "Create access role" })
		).not.toBeInTheDocument();
	});

	it("asks for the role type first and keeps the permissions locked until it is chosen", async () => {
		stubApi(routes(owner));
		await open();
		const dialog = await openDialog();

		for (const choice of within(typeField(dialog)).getAllByRole("radio"))
			expect(choice).not.toBeChecked();
		const list = within(dialog).getByRole("group", { name: "Permissions" });
		for (const item of within(list).getAllByRole("checkbox"))
			expect(item).toBeDisabled();
		expect(
			within(dialog).getByText(
				"Choose where this role can be used to see the permissions it can hold."
			)
		).toBeVisible();

		await chooseType(dialog, "In the branches or departments you choose");

		expect(
			within(typeField(dialog)).getByRole("radio", {
				name: "In the branches or departments you choose",
			})
		).toHaveAccessibleDescription(
			"You pick the places when you give someone the role."
		);
		expect(box(dialog, "Branches", "See branches")).toBeEnabled();
		expect(
			within(dialog).queryByRole("group", { name: "Company" })
		).not.toBeInTheDocument();
	});

	it("requires a role type on submit and focuses it", async () => {
		const calls = stubApi(routes(owner));
		await open();
		const dialog = await openDialog();
		await userEvent.type(within(dialog).getByLabelText("Role name"), "Auditor");
		await submit(dialog);

		expect(
			await within(dialog).findByText("Choose where this role can be used.")
		).toBeVisible();
		await waitFor(() => {
			expect(typeField(dialog)).toHaveFocus();
		});
		expect(calls.some((call) => `${call.method} ${call.path}` === CREATE)).toBe(
			false
		);
	});

	it("offers every catalogue permission for a company role to someone who holds them all", async () => {
		stubApi(routes(owner));
		await open();
		const dialog = await openDialog();
		await chooseType(dialog, "Across the whole company");
		const list = within(dialog).getByRole("group", { name: "Permissions" });
		// One box per key, plus each resource's own.
		expect(within(list).getAllByRole("checkbox")).toHaveLength(
			PERMISSION_KEYS.length + 22
		);
		for (const item of within(list).getAllByRole("checkbox"))
			expect(item).toBeEnabled();
		expect(
			within(dialog).getByText("Choose at least 1 permission.")
		).toBeVisible();
	});

	it("disables permissions the creator does not hold and says why", async () => {
		stubApi(routes(["access_role:read", "access_role:create", "branch:read"]));
		await open();
		const dialog = await openDialog();
		await chooseType(dialog, "Across the whole company");
		expect(box(dialog, "Branches", "See branches")).toBeEnabled();
		expect(box(dialog, "Branches", "Edit branches")).toBeDisabled();
		expect(box(dialog, "Access roles", "Create access roles")).toBeEnabled();
		expect(
			within(dialog).getByText(
				"Choose at least 1 permission. You can only grant permissions you hold."
			)
		).toBeVisible();
	});

	it("requires at least one permission on submit and focuses the list", async () => {
		stubApi(routes(owner));
		await open();
		const dialog = await openDialog();
		await chooseType(dialog, "Across the whole company");
		await userEvent.type(within(dialog).getByLabelText("Role name"), "Auditor");
		await submit(dialog);
		expect(
			await within(dialog).findByText("Choose at least one permission.")
		).toBeVisible();
		await waitFor(() => {
			// The first box of the list: the People section comes first.
			expect(box(dialog, "People", "People")).toHaveFocus();
		});
		await userEvent.click(box(dialog, "Activity", "See the activity record"));
		await waitFor(() => {
			expect(
				within(dialog).queryByText("Choose at least one permission.")
			).not.toBeInTheDocument();
		});
	});

	it("starts a role from a template: its type, a name and its permissions, as an ordinary role", async () => {
		const calls = stubApi({
			...routes(owner),
			[ACCESS_ROLES]: [page([]), page([role])],
		});
		await open();
		const dialog = await openDialog();
		const templates = within(dialog).getByRole("radiogroup", {
			name: "Start from",
		});
		expect(
			within(templates)
				.getAllByRole("radio")
				.map((card) => card.getAttribute("value"))
		).toEqual([
			"administrator",
			"hr_manager",
			"roster_planner",
			"department_manager",
			"leave_approver",
			"viewer",
			"scratch",
		]);
		const approver = within(templates).getByRole("radio", {
			name: "Leave approver",
		});
		expect(approver).toHaveAccessibleDescription(
			"Approves or rejects leave for the people where given. Can be given at the whole company, a branch, or a department."
		);

		await userEvent.click(approver);

		expect(
			within(dialog).getByRole("radio", {
				name: "In the branches or departments you choose",
			})
		).toBeChecked();
		expect(within(dialog).getByLabelText("Role name")).toHaveValue(
			"Leave approver"
		);
		expect(box(dialog, "Leave", "Approve or reject leave")).toBeChecked();
		await submit(dialog);
		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		expect(
			calls.find(
				(call) => call.method === "POST" && call.path.endsWith("/access-roles")
			)?.body
		).toEqual({
			kind: "LOCAL",
			name: "Leave approver",
			permissions: [
				"member_profile:read",
				"leave_request:read",
				"leave_request:review",
				"approval:read",
				"approval:decide",
			],
		});
	});

	it("leaves out a template's permissions the creator can't give, says so, and goes back to scratch", async () => {
		stubApi(
			routes(["access_role:read", "access_role:create", "member_profile:read"])
		);
		await open();
		const dialog = await openDialog();
		const templates = within(dialog).getByRole("radiogroup", {
			name: "Start from",
		});
		const approver = within(templates).getByRole("radio", {
			name: "Leave approver",
		});
		expect(approver).toHaveAccessibleDescription(
			/Includes 4 permissions you can’t give\.$/
		);

		await userEvent.click(approver);

		expect(
			within(dialog).getByText(
				"4 permissions of this template weren’t added because you can’t give them."
			)
		).toBeVisible();
		expect(
			box(dialog, "People", "See people and their profiles")
		).toBeChecked();
		expect(box(dialog, "Leave", "Approve or reject leave")).not.toBeChecked();

		await userEvent.click(
			within(templates).getByRole("radio", { name: "Start from scratch" })
		);

		expect(within(dialog).getByLabelText("Role name")).toHaveValue("");
		expect(
			box(dialog, "People", "See people and their profiles")
		).not.toBeChecked();
		expect(
			within(dialog).queryByText(/weren’t added because/)
		).not.toBeInTheDocument();
	});

	it("creates a trimmed role with its type and permissions in catalogue order and refetches the list", async () => {
		const calls = stubApi({
			...routes(owner),
			[ACCESS_ROLES]: [page([]), page([role])],
		});
		await open();
		const dialog = await openDialog();
		await chooseType(dialog, "In the branches or departments you choose");
		await userEvent.type(
			within(dialog).getByLabelText("Role name"),
			"  Branch manager "
		);
		// Edit needs View, so ticking it ticks both.
		await userEvent.click(box(dialog, "Branches", "Edit branches"));
		expect(box(dialog, "Branches", "See branches")).toBeChecked();
		expect(within(dialog).getByText("2 selected")).toBeVisible();
		await submit(dialog);
		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		expect(await screen.findByText("Branch manager")).toBeVisible();
		expect(
			calls.find(
				(call) => call.method === "POST" && call.path.endsWith("/access-roles")
			)?.body
		).toEqual({
			kind: "LOCAL",
			name: "Branch manager",
			permissions: ["branch:read", "branch:update"],
		});
	});

	it("clears company-only permissions when switched to a local role, naming them", async () => {
		stubApi(routes(owner));
		await open();
		const dialog = await openDialog();
		await chooseType(dialog, "Across the whole company");
		// Create needs View, so both are chosen.
		await userEvent.click(box(dialog, "Branches", "Create branches"));
		await userEvent.click(box(dialog, "Activity", "See the activity record"));

		await chooseType(dialog, "In the branches or departments you choose");

		expect(
			within(dialog).getByText(
				"A role for chosen places can’t hold company-wide permissions, so “Create branches” and “See the activity record” were removed."
			)
		).toBeVisible();
		expect(box(dialog, "Branches", "See branches")).toBeChecked();
		expect(within(dialog).getByText("1 selected")).toBeVisible();
	});

	it("puts a refused type on the Role type field and focuses it", async () => {
		stubApi({
			...routes(owner),
			[CREATE]: problemReply(400, "ACCESS_ROLE_KIND_CONFLICT"),
		});
		await open();
		const dialog = await openDialog();
		await chooseType(dialog, "In the branches or departments you choose");
		await userEvent.type(within(dialog).getByLabelText("Role name"), "Manager");
		await userEvent.click(box(dialog, "Branches", "See branches"));
		await submit(dialog);

		expect(
			await within(dialog).findByText(
				"A role for chosen places can’t hold company-wide permissions. Choose “Across the whole company”, or remove those permissions."
			)
		).toBeVisible();
		await waitFor(() => {
			expect(typeField(dialog)).toHaveFocus();
		});
		expect(screen.queryByText(/API says/)).not.toBeInTheDocument();
	});

	it("puts a duplicate name under the name field and focuses it", async () => {
		stubApi({
			...routes(owner),
			[CREATE]: problemReply(409, "ACCESS_ROLE_NAME_CONFLICT"),
		});
		await open();
		const dialog = await openDialog();
		await chooseType(dialog, "In the branches or departments you choose");
		await userEvent.type(within(dialog).getByLabelText("Role name"), "Manager");
		await userEvent.click(box(dialog, "Branches", "See branches"));
		await submit(dialog);
		expect(
			await within(dialog).findByText(
				'An access role named "Manager" already exists. Choose a different name.'
			)
		).toBeVisible();
		await waitFor(() => {
			expect(within(dialog).getByLabelText("Role name")).toHaveFocus();
		});
	});

	it.each([
		[
			400,
			"INVALID_ACCESS_ROLE_PERMISSIONS",
			"Some permissions are no longer available. Reload the page and try again.",
		],
		[
			403,
			"AUTHORIZATION_DENIED",
			"You can’t create this role. You may no longer hold some of the chosen permissions, or permission to create access roles.",
		],
	])(
		"shows %s %s as a focused form alert and keeps the choices",
		async (status, code, message) => {
			stubApi({
				...routes(owner),
				[CREATE]: problemReply(Number(status), String(code)),
			});
			await open();
			const dialog = await openDialog();
			await chooseType(dialog, "In the branches or departments you choose");
			await userEvent.type(
				within(dialog).getByLabelText("Role name"),
				"Manager"
			);
			await userEvent.click(box(dialog, "Branches", "See branches"));
			await submit(dialog);
			const alert = await within(dialog).findByText(String(message));
			expect(alert).toHaveAttribute("role", "alert");
			await waitFor(() => {
				expect(alert).toHaveFocus();
			});
			expect(box(dialog, "Branches", "See branches")).toBeChecked();
		}
	);
});
