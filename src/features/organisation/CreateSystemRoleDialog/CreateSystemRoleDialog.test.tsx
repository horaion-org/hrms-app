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
	app = await openApp("/organisation/system-roles");
	renderAuthApp(app);
	await screen.findByRole("heading", { name: "System roles", level: 1 });
};
const openDialog = async (): Promise<HTMLElement> => {
	await userEvent.click(
		await screen.findByRole("button", { name: "Create system role" })
	);
	return screen.findByRole("dialog", { name: "Create system role" });
};
const box = (dialog: HTMLElement, group: string, name: string): HTMLElement =>
	within(within(dialog).getByRole("group", { name: group })).getByRole(
		"checkbox",
		{ name }
	);
const submit = (dialog: HTMLElement): Promise<void> =>
	userEvent.click(
		within(dialog).getByRole("button", { name: "Create system role" })
	);

describe("create system role through the System roles page", () => {
	it("hides create without access_role:create", async () => {
		stubApi(routes(["access_role:read"]));
		await open();
		expect(
			await screen.findByRole("table", { name: "System roles" })
		).toBeVisible();
		expect(
			screen.queryByRole("button", { name: "Create system role" })
		).not.toBeInTheDocument();
	});

	it("offers every catalogue permission to someone who holds them all", async () => {
		stubApi(routes(owner));
		await open();
		const dialog = await openDialog();
		const list = within(dialog).getByRole("group", { name: "Permissions" });
		// One box per key, plus each resource's own.
		expect(within(list).getAllByRole("checkbox")).toHaveLength(
			PERMISSION_KEYS.length + 14
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
		expect(box(dialog, "Branches", "View")).toBeEnabled();
		expect(box(dialog, "Branches", "Edit")).toBeDisabled();
		expect(box(dialog, "System roles", "Create")).toBeEnabled();
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
		await userEvent.type(within(dialog).getByLabelText("Role name"), "Auditor");
		await submit(dialog);
		expect(
			await within(dialog).findByText("Choose at least one permission.")
		).toBeVisible();
		await waitFor(() => {
			expect(box(dialog, "Company", "Company")).toHaveFocus();
		});
		await userEvent.click(box(dialog, "Activity", "View"));
		await waitFor(() => {
			expect(
				within(dialog).queryByText("Choose at least one permission.")
			).not.toBeInTheDocument();
		});
	});

	it("creates a trimmed role with permissions in catalogue order and refetches the list", async () => {
		const calls = stubApi({
			...routes(owner),
			[ACCESS_ROLES]: [page([]), page([role])],
		});
		await open();
		const dialog = await openDialog();
		await userEvent.type(
			within(dialog).getByLabelText("Role name"),
			"  Branch manager "
		);
		// Edit needs View, so ticking it ticks both.
		await userEvent.click(box(dialog, "Branches", "Edit"));
		expect(box(dialog, "Branches", "View")).toBeChecked();
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
			name: "Branch manager",
			permissions: ["branch:read", "branch:update"],
		});
	});

	it("puts a duplicate name under the name field and focuses it", async () => {
		stubApi({
			...routes(owner),
			[CREATE]: problemReply(409, "ACCESS_ROLE_NAME_CONFLICT"),
		});
		await open();
		const dialog = await openDialog();
		await userEvent.type(within(dialog).getByLabelText("Role name"), "Manager");
		await userEvent.click(box(dialog, "Branches", "View"));
		await submit(dialog);
		expect(
			await within(dialog).findByText(
				'A system role named "Manager" already exists. Choose a different name.'
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
			"You can’t create this role. You may no longer hold some of the chosen permissions, or permission to create system roles.",
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
			await userEvent.type(
				within(dialog).getByLabelText("Role name"),
				"Manager"
			);
			await userEvent.click(box(dialog, "Branches", "View"));
			await submit(dialog);
			const alert = await within(dialog).findByText(String(message));
			expect(alert).toHaveAttribute("role", "alert");
			await waitFor(() => {
				expect(alert).toHaveFocus();
			});
			expect(box(dialog, "Branches", "View")).toBeChecked();
		}
	);
});
