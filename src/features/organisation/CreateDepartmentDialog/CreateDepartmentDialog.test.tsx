import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { companyWideWorkspace } from "@/common/testing/effectiveWorkspace";
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

const DEPARTMENTS = "GET /api/v1/companies/c-1/departments";
const BRANCHES = "GET /api/v1/companies/c-1/branches";
const MEMBERS = "GET /api/v1/companies/c-1/me/colleagues";
const CREATE_IN = (branchId: string): string =>
	`POST /api/v1/companies/c-1/branches/${branchId}/departments`;
const permissions = ["department:read", "department:create", "branch:read"];
const member = {
	membershipId: "m-1",
	displayName: "Marcus Lim",
	status: "ACTIVE",
};
const orchard = {
	branchId: "b-1",
	name: "Orchard Road",
	status: "ACTIVE",
	code: "ORC",
	city: "Singapore",
	country: "SG",
};
const tampines = {
	branchId: "b-2",
	name: "Tampines",
	status: "ACTIVE",
	code: "TAM",
	city: "Singapore",
	country: "SG",
};
const department = {
	departmentId: "d-1",
	branchId: "b-1",
	companyId: "c-1",
	name: "Front of house",
	status: "ACTIVE",
	headMembershipIds: ["m-1"],
};
const page = (
	content: Array<unknown>,
	totalElements = content.length
): StubReply => ({
	status: 200,
	body: envelope({ content, page: { totalElements } }),
});
const routes = (
	grants = permissions,
	branches: Array<unknown> = [orchard, tampines]
): Record<string, StubReply> => ({
	"POST /api/v1/public/sessions/refreshes": accessPassReply(),
	"GET /api/v1/me": currentUserReply(),
	"GET /api/v1/me/workspace": {
		status: 200,
		body: envelope(companyWideWorkspace(grants)),
	},
	[DEPARTMENTS]: page([]),
	[BRANCHES]: page(branches),
	[MEMBERS]: page([member]),
	[CREATE_IN("b-1")]: { status: 201, body: envelope(department) },
	[CREATE_IN("b-2")]: { status: 201, body: envelope(department) },
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
const open = async (): Promise<void> => {
	app = await openApp("/organisation/departments");
	renderAuthApp(app);
	await screen.findByRole("heading", { name: "Departments", level: 1 });
};
const openDialog = async (): Promise<HTMLElement> => {
	await userEvent.click(
		await screen.findByRole("button", { name: "Create department" })
	);
	return screen.findByRole("dialog", { name: "Create department" });
};
const chooseBranch = async (
	dialog: HTMLElement,
	name: string
): Promise<void> => {
	const user = userEvent.setup();
	await user.click(within(dialog).getByRole("button", { name: "Branch" }));
	await user.click(await screen.findByRole("option", { name }));
};
const fill = async (
	dialog: HTMLElement,
	name = "Front of house"
): Promise<void> => {
	const user = userEvent.setup();
	await user.type(within(dialog).getByLabelText("Department name"), name);
	await user.click(within(dialog).getByLabelText("Department heads"));
	await user.click(await screen.findByRole("option", { name: "Marcus Lim" }));
	await user.keyboard("{Escape}");
};
const submit = (dialog: HTMLElement): Promise<void> =>
	userEvent.click(
		within(dialog).getByRole("button", { name: "Create department" })
	);

describe("create department through the Departments page", () => {
	it.each([
		["department:read", "department:create"],
		["department:read", "branch:read"],
	])(
		"hides create when one required grant is missing: %j",
		async (...grants) => {
			const calls = stubApi(routes(grants));
			await open();
			expect(
				screen.queryByRole("button", { name: "Create department" })
			).not.toBeInTheDocument();
			expect(calls.some((call) => call.path.endsWith("/me/colleagues"))).toBe(
				false
			);
		}
	);

	it("lists only active branches, in name order, and focuses the name", async () => {
		const calls = stubApi(routes());
		await open();
		const dialog = await openDialog();
		await waitFor(() => {
			expect(within(dialog).getByLabelText("Department name")).toHaveFocus();
		});
		const branch = within(dialog).getByRole("button", { name: "Branch" });
		expect(branch).toHaveTextContent("Select a branch");
		expect(branch).toHaveAccessibleDescription(
			"The active branch the department belongs to."
		);
		expect(
			calls
				.filter((call) => call.path === "/api/v1/companies/c-1/branches")
				.map((call) => call.search)
		).toEqual(["size=100&sort=name%2Casc&status=ACTIVE"]);
		await userEvent.click(branch);
		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual(["Orchard Road", "Tampines"]);
	});

	it("offers only the branches where the person may create departments, and preselects a single one", async () => {
		stubApi({
			...routes(["branch:read"]),
			"GET /api/v1/me/workspace": {
				status: 200,
				body: envelope({
					companies: [
						{
							uuid: "c-1",
							name: "Company c-1",
							permissions: ["branch:read"],
							branches: [
								{
									uuid: "b-2",
									name: "Tampines",
									status: "ACTIVE",
									country: "SG",
									permissions: ["department:create"],
									departments: [],
								},
							],
						},
					],
				}),
			},
		});
		await open();
		const dialog = await openDialog();

		await waitFor(() => {
			expect(
				within(dialog).getByRole("button", { name: "Branch" })
			).toHaveTextContent("Tampines");
		});
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Branch" })
		);
		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual(["Tampines"]);
	});

	it("preselects the only active branch", async () => {
		stubApi(routes(permissions, [orchard]));
		await open();
		const dialog = await openDialog();
		await waitFor(() => {
			expect(
				within(dialog).getByRole("button", { name: "Branch" })
			).toHaveTextContent("Orchard Road");
		});
	});

	it("says when there is no active branch to choose", async () => {
		stubApi(routes(permissions, []));
		await open();
		const dialog = await openDialog();
		expect(
			await within(dialog).findByText(
				"No active branches. Create a branch first."
			)
		).toBeVisible();
		expect(
			within(dialog).getByRole("button", { name: "Branch" })
		).toBeDisabled();
	});

	it("requires a branch on submit and focuses it", async () => {
		stubApi(routes());
		await open();
		const dialog = await openDialog();
		await fill(dialog);
		await submit(dialog);
		expect(await within(dialog).findByText("Choose a branch.")).toBeVisible();
		await waitFor(() => {
			expect(
				within(dialog).getByRole("button", { name: "Branch" })
			).toHaveFocus();
		});
	});

	it("creates a trimmed department in the chosen branch, closes, and refetches the list", async () => {
		const calls = stubApi({
			...routes(),
			[DEPARTMENTS]: [page([]), page([department])],
		});
		await open();
		const dialog = await openDialog();
		await chooseBranch(dialog, "Tampines");
		await fill(dialog, "  Front of house  ");
		await submit(dialog);
		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		expect(await screen.findByText("Front of house")).toBeVisible();
		const post = calls.find(
			(call) => call.method === "POST" && call.path.endsWith("/departments")
		);
		expect(post?.path).toBe("/api/v1/companies/c-1/branches/b-2/departments");
		expect(post?.body).toEqual({
			name: "Front of house",
			initialHeadCompanyMembershipIds: ["m-1"],
		});
	});

	it("keeps a duplicate name in place, quotes it and focuses name", async () => {
		stubApi({
			...routes(),
			[CREATE_IN("b-1")]: problemReply(409, "DEPARTMENT_NAME_CONFLICT"),
		});
		await open();
		const dialog = await openDialog();
		await chooseBranch(dialog, "Orchard Road");
		await fill(dialog);
		await submit(dialog);
		expect(
			await within(dialog).findByText(
				'A department named "Front of house" already exists in this branch. Choose a different name.'
			)
		).toBeVisible();
		await waitFor(() => {
			expect(within(dialog).getByLabelText("Department name")).toHaveFocus();
		});
		expect(within(dialog).getByLabelText("Department name")).toHaveValue(
			"Front of house"
		);
	});

	it("places a rejected name under the name field", async () => {
		stubApi({
			...routes(),
			[CREATE_IN("b-1")]: problemReply(400, "INVALID_DEPARTMENT_NAME"),
		});
		await open();
		const dialog = await openDialog();
		await chooseBranch(dialog, "Orchard Road");
		await fill(dialog);
		await submit(dialog);
		expect(
			await within(dialog).findByText(
				"Check the department name and try again."
			)
		).toBeVisible();
	});

	it("refetches stale people, keeps Tokens and focuses heads on refusal", async () => {
		const calls = stubApi({
			...routes(),
			[CREATE_IN("b-1")]: problemReply(400, "INVALID_INITIAL_DEPARTMENT_HEAD"),
		});
		await open();
		const dialog = await openDialog();
		await chooseBranch(dialog, "Orchard Road");
		await fill(dialog);
		const before = calls.filter((call) =>
			call.path.endsWith("/me/colleagues")
		).length;
		await submit(dialog);
		expect(
			await within(dialog).findByText(
				"One of the chosen people is no longer an active member. Remove them and try again."
			)
		).toBeVisible();
		await waitFor(() => {
			expect(within(dialog).getByLabelText("Department heads")).toHaveFocus();
			expect(
				calls.filter((call) => call.path.endsWith("/me/colleagues")).length
			).toBeGreaterThan(before);
		});
		expect(
			within(dialog).getByRole("button", { name: "Remove Marcus Lim" })
		).toBeVisible();
	});

	it("asks for another branch when the chosen one is gone and reloads the list", async () => {
		const calls = stubApi({
			...routes(),
			[CREATE_IN("b-1")]: problemReply(404, "BRANCH_NOT_FOUND"),
		});
		await open();
		const dialog = await openDialog();
		await chooseBranch(dialog, "Orchard Road");
		await fill(dialog);
		await submit(dialog);
		expect(
			await within(dialog).findByText(
				"This branch is no longer available. Choose another branch."
			)
		).toBeVisible();
		await waitFor(() => {
			expect(
				calls.filter((call) => call.path === "/api/v1/companies/c-1/branches")
			).toHaveLength(2);
		});
	});

	it.each([
		[
			403,
			"AUTHORIZATION_DENIED",
			"You no longer have permission to create departments.",
		],
		[500, "INTERNAL_ERROR", "We couldn’t create the department. Try again."],
	])(
		"shows a translated form alert for %s and keeps the input",
		async (status, code, message) => {
			stubApi({
				...routes(),
				[CREATE_IN("b-1")]: problemReply(Number(status), String(code)),
			});
			await open();
			const dialog = await openDialog();
			await chooseBranch(dialog, "Orchard Road");
			await fill(dialog);
			await submit(dialog);
			const alert = await within(dialog).findByText(String(message));
			expect(alert).toHaveAttribute("role", "alert");
			await waitFor(() => {
				expect(alert).toHaveFocus();
			});
			expect(within(dialog).getByLabelText("Department name")).toHaveValue(
				"Front of house"
			);
		}
	);

	it("cancel discards and a reopened Dialog starts empty", async () => {
		stubApi(routes());
		await open();
		const dialog = await openDialog();
		await userEvent.type(
			within(dialog).getByLabelText("Department name"),
			"Draft"
		);
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Cancel" })
		);
		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		const fresh = await openDialog();
		expect(within(fresh).getByLabelText("Department name")).toHaveValue("");
	});
});
