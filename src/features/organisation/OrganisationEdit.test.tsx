import { act, screen, waitFor, within } from "@testing-library/react";
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
import { workspaceQuery } from "@/features/workspace/api";

const cases = [
	{
		kind: "branch",
		path: "/organisation/branches",
		list: "/api/v1/companies/c-1/branches",
		update: "/api/v1/companies/c-1/branches/b-1",
		label: "Branch name",
		dialog: "Edit branch",
		conflict: "BRANCH_NAME_CONFLICT",
		row: {
			branchId: "b-1",
			name: "Orchard",
			code: "ORC",
			city: "Singapore",
			country: "SG",
			status: "INACTIVE",
		},
	},
	{
		kind: "department",
		path: "/organisation/departments",
		list: "/api/v1/companies/c-1/departments",
		update: "/api/v1/companies/c-1/branches/b-1/departments/d-1",
		label: "Department name",
		dialog: "Edit department",
		conflict: "DEPARTMENT_NAME_CONFLICT",
		row: {
			departmentId: "d-1",
			branchId: "b-1",
			name: "Kitchen",
			status: "INACTIVE",
		},
	},
] as const;

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

const open = async (path: string): Promise<void> => {
	app = await openApp(path);
	renderAuthApp(app);
};
const page = (row: unknown): StubReply => ({
	status: 200,
	body: envelope({ content: [row], page: { totalElements: 1 } }),
});
const sessionRoutes = (
	permissions: Array<string>
): Record<string, StubReply> => ({
	"POST /api/v1/public/sessions/refreshes": accessPassReply(),
	"GET /api/v1/me": currentUserReply(),
	"GET /api/v1/me/workspace": {
		status: 200,
		body: envelope(companyWideWorkspace(permissions)),
	},
});

describe.each(cases)("editing a $kind from its list", (item) => {
	const permissions = [`${item.kind}:read`, `${item.kind}:update`];
	const openDialog = async (): Promise<HTMLElement> => {
		await userEvent.click(
			await screen.findByRole("button", { name: `Edit ${item.row.name}` })
		);
		return screen.findByRole("dialog", { name: item.dialog });
	};
	const rename = async (
		dialog: HTMLElement,
		value = "Central"
	): Promise<void> => {
		const input = within(dialog).getByLabelText(item.label);
		await userEvent.clear(input);
		await userEvent.type(input, value);
	};
	const save = (dialog: HTMLElement): Promise<void> =>
		userEvent.click(
			within(dialog).getByRole("button", { name: "Save changes" })
		);

	it("opens pre-filled details with update-only permission, saves and refreshes the list", async () => {
		let saved: unknown = item.row;
		const calls = stubApi({
			...sessionRoutes(permissions),
			[`GET ${item.list}`]: () => page(saved),
			[`PUT ${item.update}`]: ({ body }) => {
				saved = { ...item.row, ...(body as Record<string, unknown>) };
				return { status: 200, body: envelope(saved) };
			},
		});
		await open(item.path);
		const dialog = await openDialog();
		expect(within(dialog).getByLabelText(item.label)).toHaveValue(
			item.row.name
		);
		expect(
			within(dialog).getByRole("button", { name: "Save changes" })
		).toBeDisabled();
		expect(within(dialog).queryByLabelText(/heads/i)).not.toBeInTheDocument();
		await rename(dialog, "  Central  ");
		if (item.kind === "branch") {
			expect(within(dialog).getByLabelText("Branch code")).toHaveValue("ORC");
			expect(within(dialog).getByLabelText("City")).toHaveValue("Singapore");
			expect(within(dialog).getByLabelText("Country")).toHaveTextContent(
				"Singapore"
			);
			await userEvent.clear(within(dialog).getByLabelText("Branch code"));
			await userEvent.type(
				within(dialog).getByLabelText("Branch code"),
				"cen-2"
			);
			await userEvent.clear(within(dialog).getByLabelText("City"));
			await userEvent.type(
				within(dialog).getByLabelText("City"),
				"  Kuala   Lumpur  "
			);
			await userEvent.click(within(dialog).getByLabelText("Country"));
			await userEvent.type(
				screen.getByRole("combobox", { name: "Search countries" }),
				"Malaysia"
			);
			await userEvent.click(
				await screen.findByRole("option", { name: "Malaysia" })
			);
		} else {
			expect(
				within(dialog).queryByRole("button", { name: "Branch" })
			).not.toBeInTheDocument();
		}
		await save(dialog);
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
		);
		expect(
			await screen.findByRole("button", { name: "Edit Central" })
		).toBeEnabled();
		expect(
			calls
				.filter((call) => call.method === "PUT")
				.map((call) => ({ path: call.path, body: call.body }))
		).toEqual([
			{
				path: item.update,
				body:
					item.kind === "branch"
						? {
								name: "Central",
								code: "CEN-2",
								city: "Kuala Lumpur",
								country: "MY",
								status: "INACTIVE",
							}
						: { name: "Central", status: "INACTIVE" },
			},
		]);
		expect(
			calls.filter((call) => call.path === item.list && call.method === "GET")
				.length
		).toBeGreaterThan(1);
		expect(
			calls.filter((call) => call.path === "/api/v1/me/workspace").length
		).toBeGreaterThan(1);
		expect(calls.some((call) => call.path.includes("/colleagues"))).toBe(false);
		if (item.kind === "department")
			expect(
				calls.some((call) => call.path === "/api/v1/companies/c-1/branches")
			).toBe(false);
	});

	it("discards edits on Cancel, including the department menu entry", async () => {
		const calls = stubApi({
			...sessionRoutes(permissions),
			[`GET ${item.list}`]: page(item.row),
		});
		await open(item.path);
		if (item.kind === "department") {
			await userEvent.click(
				await screen.findByRole("button", {
					name: `More actions for ${item.row.name}`,
				})
			);
			await userEvent.click(
				await screen.findByRole("menuitem", { name: "Edit" })
			);
		} else {
			await openDialog();
		}
		const dialog = await screen.findByRole("dialog", { name: item.dialog });
		await rename(dialog);
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Cancel" })
		);
		const reopened = await openDialog();
		expect(within(reopened).getByLabelText(item.label)).toHaveValue(
			item.row.name
		);
		expect(calls.some((call) => call.method === "PUT")).toBe(false);
	});

	it("keeps entered values on a duplicate-name refusal and focuses the field", async () => {
		stubApi({
			...sessionRoutes(permissions),
			[`GET ${item.list}`]: page(item.row),
			[`PUT ${item.update}`]: problemReply(409, item.conflict),
		});
		await open(item.path);
		const dialog = await openDialog();
		await rename(dialog);
		await save(dialog);
		expect(await within(dialog).findByText(/already exists/)).toBeVisible();
		expect(within(dialog).getByLabelText(item.label)).toHaveValue("Central");
		await waitFor(() =>
			expect(within(dialog).getByLabelText(item.label)).toHaveFocus()
		);
	});

	it.each([
		{
			status: 403,
			code: "ACCESS_DENIED",
			message: `You no longer have permission to edit this ${item.kind}.`,
		},
		{
			status: 404,
			code: `${item.kind.toUpperCase()}_NOT_FOUND`,
			message: `This ${item.kind} is no longer available. Close this dialog and refresh the list.`,
		},
		{
			status: 500,
			code: "INTERNAL_ERROR",
			message: `We couldn’t save the ${item.kind}. Try again.`,
		},
	])(
		"explains a $status refusal without losing the edits",
		async ({ status, code, message }) => {
			stubApi({
				...sessionRoutes(permissions),
				[`GET ${item.list}`]: page(item.row),
				[`PUT ${item.update}`]: problemReply(status, code),
			});
			await open(item.path);
			const dialog = await openDialog();
			await rename(dialog);
			await save(dialog);
			expect(await within(dialog).findByRole("alert")).toHaveTextContent(
				message
			);
			expect(within(dialog).getByLabelText(item.label)).toHaveValue("Central");
		}
	);

	it("disables Edit with read-only access", async () => {
		stubApi({
			...sessionRoutes([`${item.kind}:read`]),
			[`GET ${item.list}`]: page(item.row),
		});
		await open(item.path);
		expect(
			await screen.findByRole("button", { name: `Edit ${item.row.name}` })
		).toBeDisabled();
	});

	it("withdraws the editor when update permission is removed", async () => {
		const calls = stubApi({
			...sessionRoutes(permissions),
			[`GET ${item.list}`]: page(item.row),
		});
		await open(item.path);
		await openDialog();
		act(() => {
			app?.queryClient.setQueryData(
				workspaceQuery.queryKey,
				companyWideWorkspace([`${item.kind}:read`])
			);
		});
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
		);
		expect(calls.some((call) => call.method === "PUT")).toBe(false);
	});
});
