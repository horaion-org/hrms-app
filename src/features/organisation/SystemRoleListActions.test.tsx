import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	companyWideWorkspace,
	effectiveWorkspace,
	TEST_BRANCHES,
} from "@/common/testing/effectiveWorkspace";
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
const ROLE_PATH = "/api/v1/companies/c-1/access-roles/r-2";
const HOLDERS = `GET ${ROLE_PATH}/access-role-assignments`;
const ASSIGNMENT_PATH = "/api/v1/companies/c-1/access-role-assignments/a-2";

const role = (
	overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
	accessRoleId: "r-2",
	companyId: "c-1",
	name: "Manager",
	protectedRole: false,
	status: "ACTIVE",
	permissions: ["branch:read", "department:read"],
	holderCount: 2,
	...overrides,
});

// The person testing is `m-c-1`, so the first holder is them.
const holders = [
	{
		accessRoleAssignmentId: "a-1",
		companyMembershipId: "m-c-1",
		displayName: "Priya Nair",
		status: "ACTIVE",
		branchId: null,
		branchName: null,
		departmentId: null,
		departmentName: null,
	},
	{
		accessRoleAssignmentId: "a-2",
		companyMembershipId: "m-9",
		displayName: "Daniel Tan",
		status: "ACTIVE",
		branchId: "b-1",
		branchName: "Orchard",
		departmentId: "d-1",
		departmentName: "Kitchen",
	},
];

const routes = (
	listed: Record<string, unknown> = role(),
	held: ReadonlyArray<string> = PERMISSION_KEYS
): Record<string, StubReply> => ({
	"POST /api/v1/public/sessions/refreshes": accessPassReply(),
	"GET /api/v1/me": currentUserReply(),
	"GET /api/v1/me/workspace": {
		status: 200,
		body: envelope(companyWideWorkspace(held)),
	},
	[ROLES]: {
		status: 200,
		body: envelope({ content: [listed], page: { totalElements: 1 } }),
	},
	[`GET ${ROLE_PATH}`]: { status: 200, body: envelope(listed) },
	[HOLDERS]: { status: 200, body: envelope(holders) },
	[`PUT ${ROLE_PATH}`]: { status: 200, body: envelope(listed) },
	[`DELETE ${ROLE_PATH}`]: { status: 204 },
	[`DELETE ${ASSIGNMENT_PATH}`]: { status: 204 },
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

const openMenu = async (): Promise<HTMLElement> => {
	app = await openApp("/organisation/system-roles");
	renderAuthApp(app);
	await userEvent.click(
		await screen.findByRole("button", { name: "More actions for Manager" })
	);
	return screen.getByRole("menu");
};

const choose = async (item: string): Promise<void> => {
	await userEvent.click(
		within(await openMenu()).getByRole("menuitem", { name: item })
	);
};

describe("System role list actions", () => {
	it("offers each action once, leaving Edit to the pencil", async () => {
		stubApi(routes());
		app = await openApp("/organisation/system-roles");
		renderAuthApp(app);

		expect(
			await screen.findByRole("button", { name: "Edit Manager" })
		).toBeEnabled();
		await userEvent.click(
			screen.getByRole("button", { name: "More actions for Manager" })
		);
		const menu = screen.getByRole("menu");
		expect(
			within(menu)
				.getAllByRole("menuitem")
				.map((item) => item.textContent)
		).toEqual(["View", "Duplicate", "Deactivate", "Delete"]);
		// A role somebody holds can't be deleted.
		expect(
			within(menu).getByRole("menuitem", { name: "Delete" })
		).toHaveAttribute("aria-disabled", "true");
	});

	it("deactivates a role only after showing who loses access, the person themselves included", async () => {
		const calls = stubApi(routes());
		await choose("Deactivate");
		const dialog = await screen.findByRole("dialog", {
			name: "Deactivate Manager",
		});

		expect(
			await within(dialog).findByText(
				"Deactivating this role removes the access it gives 2 people."
			)
		).toBeVisible();
		expect(dialog).toHaveTextContent(
			"You hold this role. You will lose these permissions too."
		);
		expect(within(dialog).getByText("Daniel Tan")).toBeVisible();
		expect(within(dialog).getByText("Orchard › Kitchen")).toBeVisible();
		expect(calls.some((call) => call.method === "PUT")).toBe(false);

		await userEvent.click(
			within(dialog).getByRole("button", {
				name: "Deactivate and remove access for 2 people",
			})
		);

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		expect(
			calls.filter((call) => call.method === "PUT").map((call) => call.body)
		).toEqual([
			{
				name: "Manager",
				permissions: ["branch:read", "department:read"],
				status: "INACTIVE",
			},
		]);
	});

	it("activates an inactive role after saying who gets access back", async () => {
		const calls = stubApi(routes(role({ status: "INACTIVE" })));
		await choose("Activate");
		const dialog = await screen.findByRole("dialog", {
			name: "Activate Manager",
		});

		await userEvent.click(
			await within(dialog).findByRole("button", {
				name: "Activate and give access to 2 people",
			})
		);

		await waitFor(() => {
			expect(
				calls.filter((call) => call.method === "PUT").map((call) => call.body)
			).toEqual([
				{
					name: "Manager",
					permissions: ["branch:read", "department:read"],
					status: "ACTIVE",
				},
			]);
		});
	});

	it("won't let a role be deactivated when who holds it can't be checked", async () => {
		const calls = stubApi({
			...routes(),
			[HOLDERS]: problemReply(403, "AUTHORIZATION_DENIED"),
		});
		await choose("Deactivate");
		const dialog = await screen.findByRole("dialog", {
			name: "Deactivate Manager",
		});

		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			"We couldn’t check who holds this role, so it can’t be changed right now. Try again."
		);
		expect(
			within(dialog).getByRole("button", { name: "Deactivate role" })
		).toBeDisabled();
		expect(calls.some((call) => call.method === "PUT")).toBe(false);
	});

	it("deletes a role nobody holds after asking, and explains a refusal", async () => {
		const calls = stubApi({
			...routes(role({ holderCount: 0 })),
			[`DELETE ${ROLE_PATH}`]: [
				problemReply(409, "ACCESS_ROLE_IN_USE"),
				{ status: 204 },
			],
		});
		await choose("Delete");
		const dialog = await screen.findByRole("dialog", {
			name: "Delete Manager",
		});
		const confirm = within(dialog).getByRole("button", { name: "Delete role" });

		expect(calls.some((call) => call.method === "DELETE")).toBe(false);
		await userEvent.click(confirm);
		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			"This role is still assigned to someone. Remove it from everyone first."
		);

		await userEvent.click(confirm);
		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		expect(calls.filter((call) => call.method === "DELETE")).toHaveLength(2);
	});

	it("duplicates a role into the create dialog with its name and permissions filled in", async () => {
		stubApi(routes());
		await choose("Duplicate");
		const dialog = await screen.findByRole("dialog", {
			name: "Create system role",
		});

		expect(within(dialog).getByLabelText("Role name")).toHaveValue(
			"Manager copy"
		);
		const box = (group: string, name: string): HTMLElement =>
			within(within(dialog).getByRole("group", { name: group })).getByRole(
				"checkbox",
				{ name }
			);
		expect(box("Branches", "View")).toBeChecked();
		expect(box("Departments", "View")).toBeChecked();
		expect(box("Branches", "Edit")).not.toBeChecked();
	});
});

describe("System role people", () => {
	it("edits where a person has the role from their pencil, removing a place they no longer need", async () => {
		const calls = stubApi({
			...routes(),
			"GET /api/v1/companies/c-1/branches": {
				status: 200,
				body: envelope({ content: [], page: { totalElements: 0 } }),
			},
			"GET /api/v1/companies/c-1/departments": {
				status: 200,
				body: envelope({ content: [], page: { totalElements: 0 } }),
			},
			"GET /api/v1/companies/c-1/me/colleagues": {
				status: 200,
				body: envelope({ content: [], page: { totalElements: 0 } }),
			},
		});
		app = await openApp("/organisation/system-roles/r-2");
		renderAuthApp(app);

		await userEvent.click(
			await screen.findByRole("button", { name: "Edit Daniel Tan" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Edit assignment",
		});
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Remove Orchard › Kitchen" })
		);
		expect(calls.some((call) => call.method === "DELETE")).toBe(false);
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Save changes" })
		);

		await waitFor(() => {
			expect(
				calls
					.filter((call) => call.method === "DELETE")
					.map((call) => call.path)
			).toEqual([ASSIGNMENT_PATH]);
		});
		// Nothing new was chosen, so nothing is granted.
		expect(
			calls.some(
				(call) =>
					call.method === "POST" &&
					call.path.endsWith("/access-role-assignments")
			)
		).toBe(false);
	});

	it("switches the role off for one person from More actions, after asking", async () => {
		const calls = stubApi({
			...routes(),
			[`PUT ${ASSIGNMENT_PATH}`]: { status: 200, body: envelope({}) },
		});
		app = await openApp("/organisation/system-roles/r-2");
		renderAuthApp(app);

		await userEvent.click(
			await screen.findByRole("button", { name: "More actions for Daniel Tan" })
		);
		await userEvent.click(screen.getByRole("menuitem", { name: "Deactivate" }));
		const dialog = await screen.findByRole("dialog", {
			name: "Deactivate the role for Daniel Tan",
		});
		expect(dialog).toHaveTextContent(
			"Daniel Tan will lose the access the Manager role gives them."
		);
		expect(calls.some((call) => call.method === "PUT")).toBe(false);

		await userEvent.click(
			within(dialog).getByRole("button", { name: "Deactivate for Daniel Tan" })
		);

		await waitFor(() => {
			expect(
				calls
					.filter((call) => call.method === "PUT")
					.map((call) => [call.path, call.body])
			).toEqual([[ASSIGNMENT_PATH, { status: "INACTIVE" }]]);
		});
	});

	it("removes the role from one person everywhere from More actions, after asking", async () => {
		const calls = stubApi(routes());
		app = await openApp("/organisation/system-roles/r-2");
		renderAuthApp(app);

		await userEvent.click(
			await screen.findByRole("button", { name: "More actions for Daniel Tan" })
		);
		await userEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
		const dialog = await screen.findByRole("dialog", {
			name: "Remove Daniel Tan from this role",
		});
		expect(calls.some((call) => call.method === "DELETE")).toBe(false);

		await userEvent.click(
			within(dialog).getByRole("button", { name: "Remove from role" })
		);

		await waitFor(() => {
			expect(
				calls
					.filter((call) => call.method === "DELETE")
					.map((call) => call.path)
			).toEqual([ASSIGNMENT_PATH]);
		});
	});

	it("marks an inactive role and offers no assigning while it is switched off", async () => {
		stubApi(routes(role({ status: "INACTIVE" })));
		app = await openApp("/organisation/system-roles/r-2");
		renderAuthApp(app);

		expect(
			await screen.findByText(
				"This role is inactive, so the people below don’t have its permissions until it is activated again."
			)
		).toBeVisible();
		expect(screen.getByText("Inactive")).toBeVisible();
		expect(
			screen.queryByRole("button", { name: "Assign role" })
		).not.toBeInTheDocument();
	});
});

/**
 * Reads roles company-wide but may assign only at Orchard › Kitchen (`d-1`),
 * as the API's workspace shows that narrow grant.
 */
const kitchenAssigner = (): StubReply => ({
	status: 200,
	body: envelope(
		effectiveWorkspace({
			companies: [
				{
					uuid: "c-1",
					name: "Company c-1",
					permissions: ["access_role:read", "branch:read", "department:read"],
					branches: TEST_BRANCHES.map((branch) => ({
						...branch,
						departments: branch.departments.map((department) => ({
							...department,
							permissions:
								department.uuid === "d-1" ? ["access_role:assign"] : [],
						})),
					})),
				},
			],
		})
	),
});

/** Daniel Tan holds the role at Kitchen (`a-2`) and at Tampines (`a-3`). */
const spreadHolders = [
	...holders,
	{
		accessRoleAssignmentId: "a-3",
		companyMembershipId: "m-9",
		displayName: "Daniel Tan",
		status: "ACTIVE",
		branchId: "b-2",
		branchName: "Tampines",
		departmentId: null,
		departmentName: null,
	},
];

const COLLEAGUES = "GET /api/v1/companies/c-1/me/colleagues";
const ASSIGNMENTS = "/access-role-assignments";

describe("System role people, checked at each assignment's own place", () => {
	it("names what keeps a role from fitting the only places the person may assign at", async () => {
		stubApi({
			...routes(),
			"GET /api/v1/me/workspace": kitchenAssigner(),
			[COLLEAGUES]: {
				status: 200,
				body: envelope({ content: [], page: { totalElements: 0 } }),
			},
		});
		app = await openApp("/organisation/system-roles/r-2");
		renderAuthApp(app);

		await userEvent.click(
			await screen.findByRole("button", { name: "Assign role" })
		);
		const dialog = await screen.findByRole("dialog", { name: "Assign role" });

		// Branches: View can't be given at a Department, the only place in reach.
		expect(dialog).toHaveTextContent(
			"This role can’t be given at any place you may assign it: Branches: View can only be given more widely."
		);
	});

	it("offers only the places where the person may assign, from the workspace, to any active member", async () => {
		const calls = stubApi({
			...routes(role({ permissions: ["department:read"] })),
			"GET /api/v1/me/workspace": kitchenAssigner(),
			[COLLEAGUES]: {
				status: 200,
				body: envelope({
					content: [
						{ membershipId: "m-5", displayName: "Alice Lim", status: "ACTIVE" },
					],
					page: { totalElements: 1 },
				}),
			},
		});
		app = await openApp("/organisation/system-roles/r-2");
		renderAuthApp(app);

		await userEvent.click(
			await screen.findByRole("button", { name: "Assign role" })
		);
		const dialog = await screen.findByRole("dialog", { name: "Assign role" });
		await userEvent.click(within(dialog).getByLabelText("Applies to"));
		expect(
			(await screen.findAllByRole("option")).map((option) => option.textContent)
		).toEqual(["Orchard › Kitchen"]);
		await userEvent.keyboard("{Escape}");
		await userEvent.click(within(dialog).getByLabelText("Person"));
		expect(
			await screen.findByRole("option", { name: "Alice Lim" })
		).toBeVisible();

		// Recipients come from the colleagues directory; places never need the unit lists.
		expect(calls.some((call) => call.path.endsWith("/me/colleagues"))).toBe(
			true
		);
		expect(
			calls.some(
				(call) =>
					call.path === "/api/v1/companies/c-1/branches" ||
					call.path === "/api/v1/companies/c-1/departments"
			)
		).toBe(false);
	});

	it("changes only the assignments at places the person may assign at, leaving the rest of the row untouched (R14)", async () => {
		const calls = stubApi({
			...routes(),
			"GET /api/v1/me/workspace": kitchenAssigner(),
			[HOLDERS]: { status: 200, body: envelope(spreadHolders) },
			[COLLEAGUES]: {
				status: 200,
				body: envelope({ content: [], page: { totalElements: 0 } }),
			},
		});
		app = await openApp("/organisation/system-roles/r-2");
		renderAuthApp(app);

		// Priya holds it company-wide, out of reach: nothing on her row can be changed.
		expect(
			await screen.findByRole("button", { name: "Edit Priya Nair" })
		).toBeDisabled();

		await userEvent.click(
			screen.getByRole("button", { name: "Edit Daniel Tan" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Edit assignment",
		});
		expect(dialog).toHaveTextContent(
			"Daniel Tan also has this role at Tampines. You can’t change those places"
		);
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Remove Orchard › Kitchen" })
		);
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Save changes" })
		);

		await waitFor(() => {
			expect(
				calls
					.filter((call) => call.method === "DELETE")
					.map((call) => call.path)
			).toEqual([ASSIGNMENT_PATH]);
		});
		expect(calls.some((call) => call.path.endsWith("/a-3"))).toBe(false);
	});

	it("removes a grouped person only where the person may assign", async () => {
		const calls = stubApi({
			...routes(),
			"GET /api/v1/me/workspace": kitchenAssigner(),
			[HOLDERS]: { status: 200, body: envelope(spreadHolders) },
		});
		app = await openApp("/organisation/system-roles/r-2");
		renderAuthApp(app);

		await userEvent.click(
			await screen.findByRole("button", { name: "More actions for Daniel Tan" })
		);
		await userEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
		await userEvent.click(
			within(
				await screen.findByRole("dialog", {
					name: "Remove Daniel Tan from this role",
				})
			).getByRole("button", { name: "Remove from role" })
		);

		await waitFor(() => {
			expect(
				calls
					.filter((call) => call.method === "DELETE")
					.map((call) => call.path)
			).toEqual([ASSIGNMENT_PATH]);
		});
	});

	it("says how many changes failed when only some did, keeping the dialog open (F12)", async () => {
		const calls = stubApi({
			...routes(),
			[COLLEAGUES]: {
				status: 200,
				body: envelope({ content: [], page: { totalElements: 0 } }),
			},
			[`POST /api/v1/companies/c-1/branches/b-2${ASSIGNMENTS}`]: problemReply(
				403,
				"AUTHORIZATION_DENIED"
			),
		});
		app = await openApp("/organisation/system-roles/r-2");
		renderAuthApp(app);

		await userEvent.click(
			await screen.findByRole("button", { name: "Edit Daniel Tan" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Edit assignment",
		});
		// Remove Kitchen (succeeds) and add Tampines (refused).
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Remove Orchard › Kitchen" })
		);
		await userEvent.click(within(dialog).getByLabelText("Applies to"));
		await userEvent.click(
			await screen.findByRole("option", { name: "Tampines" })
		);
		await userEvent.keyboard("{Escape}");
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Save changes" })
		);

		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			"1 of 2 changes couldn’t be made; the others were saved. You can only assign a role whose permissions you hold there."
		);
		expect(
			calls.filter((call) => call.method === "DELETE").map((call) => call.path)
		).toEqual([ASSIGNMENT_PATH]);
		// Where things now stand is asked for again.
		await waitFor(() => {
			expect(
				calls.filter((call) => `${call.method} ${call.path}` === HOLDERS).length
			).toBeGreaterThan(1);
		});
	});
});
