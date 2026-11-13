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
import {
	LEAVE_TYPE_CATALOGUE_FIXTURE,
	managedLeaveTypeFixture,
} from "@/features/leaveTypes/fixtures";

const LEAVE_TYPES = "/api/v1/companies/c-1/leave-types";
const READ_AND_UPDATE = ["leave_type:read", "leave_type:update"];

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

const routes = (
	permissions: Array<string>,
	extra: Record<string, StubReply | Array<StubReply>> = {}
): Record<string, StubReply | Array<StubReply>> => ({
	"POST /api/v1/public/sessions/refreshes": accessPassReply(),
	"GET /api/v1/me": currentUserReply(),
	"GET /api/v1/me/workspace": {
		status: 200,
		body: envelope(companyWideWorkspace(permissions)),
	},
	[`GET ${LEAVE_TYPES}`]: {
		status: 200,
		body: envelope(LEAVE_TYPE_CATALOGUE_FIXTURE),
	},
	...extra,
});

/** The fixture catalogue after Sick leave moved above Annual leave. */
const SICK_FIRST = LEAVE_TYPE_CATALOGUE_FIXTURE.map((type) =>
	type.leaveTypeId === "lt-sick"
		? { ...type, displayOrder: 1 }
		: type.leaveTypeId === "lt-annual"
			? { ...type, displayOrder: 2 }
			: type
);

const catalogueReads = (calls: ReturnType<typeof stubApi>): number =>
	calls.filter((call) => call.method === "GET" && call.path === LEAVE_TYPES)
		.length;

const open = async (): Promise<HTMLElement> => {
	app = await openApp("/settings?section=leave");
	renderAuthApp(app);
	return screen.findByRole("tabpanel", { name: "Leave" });
};

describe("LeaveTypesSettings", () => {
	it("lists the day off locked, each kind's active types in order and the inactive ones", async () => {
		stubApi(routes(READ_AND_UPDATE));
		const panel = await open();

		const system = await within(panel).findByRole("table", {
			name: "Assigned by the scheduler",
		});
		expect(within(system).getByRole("row", { name: /Day off/ })).toBeVisible();
		expect(
			within(system).getByRole("img", { name: "System type" })
		).toBeVisible();
		expect(
			within(system).queryByRole("button", { name: /Day off/ })
		).toBeNull();

		const yearly = within(panel).getByRole("table", {
			name: "Yearly allowance",
		});
		const rows = within(yearly).getAllByRole("row").slice(1);
		expect(rows.map((row) => row.textContent)).toEqual([
			expect.stringContaining("Annual leave"),
			expect.stringContaining("Sick leave"),
		]);
		expect(rows[0]).toHaveTextContent("Paid");
		expect(rows[0]).toHaveTextContent("12 requests");
		expect(
			within(panel).getByRole("table", { name: "Per occasion" })
		).toHaveTextContent("Marriage leave");
		const inactive = within(panel).getByRole("table", {
			name: "Inactive leave types",
		});
		expect(inactive).toHaveTextContent("Study leave");
		expect(inactive).toHaveTextContent("Unpaid · Reason required");
		expect(
			within(panel).getByRole("button", { name: "Add leave type" })
		).toBeVisible();
	});

	it("offers no changes without leave_type:update", async () => {
		stubApi(routes(["leave_type:read"]));
		const panel = await open();

		await within(panel).findByRole("table", { name: "Yearly allowance" });
		expect(
			within(panel).queryByRole("button", { name: "Add leave type" })
		).toBeNull();
		expect(
			within(panel).queryByRole("button", { name: /^(Move|Edit) / })
		).toBeNull();
	});

	it("says the leave types are not the person's to see when a link opens the section", async () => {
		stubApi(routes([]));
		const panel = await open();

		expect(
			await within(panel).findByText(
				"You don’t have permission to see the leave types."
			)
		).toBeVisible();
	});

	it("alerts when the catalogue fails to load (a refusal that is not retried)", async () => {
		stubApi(
			routes(READ_AND_UPDATE, {
				[`GET ${LEAVE_TYPES}`]: problemReply(404, "COMPANY_NOT_FOUND"),
			})
		);
		const panel = await open();

		expect(await within(panel).findByRole("alert")).toHaveTextContent(
			"We couldn’t load the leave types. Try again."
		);
	});

	it("moves a type up within its kind and sends the kind's whole order", async () => {
		const calls = stubApi(
			routes(READ_AND_UPDATE, {
				[`PUT ${LEAVE_TYPES}/order`]: {
					status: 200,
					body: envelope(LEAVE_TYPE_CATALOGUE_FIXTURE),
				},
			})
		);
		const user = userEvent.setup();
		const panel = await open();

		expect(
			await within(panel).findByRole("button", { name: "Move Annual leave up" })
		).toHaveAttribute("aria-disabled", "true");
		await user.click(
			within(panel).getByRole("button", { name: "Move Sick leave up" })
		);

		await waitFor(() => {
			expect(
				calls.find(
					(call) =>
						call.method === "PUT" && call.path === `${LEAVE_TYPES}/order`
				)?.body
			).toEqual({
				grantKind: "ALLOWANCE",
				leaveTypeIds: ["lt-sick", "lt-annual"],
			});
		});
	});

	it("deactivates a used type after saying its requests keep it", async () => {
		const calls = stubApi(
			routes(READ_AND_UPDATE, {
				[`PUT ${LEAVE_TYPES}/lt-annual`]: {
					status: 200,
					body: envelope({
						...LEAVE_TYPE_CATALOGUE_FIXTURE[0],
						status: "INACTIVE",
					}),
				},
			})
		);
		const user = userEvent.setup();
		const panel = await open();

		await user.click(
			await within(panel).findByRole("button", {
				name: "More actions for Annual leave",
			})
		);
		await user.click(
			await screen.findByRole("menuitem", { name: "Deactivate" })
		);
		const confirm = await screen.findByRole("dialog", {
			name: "Deactivate Annual leave?",
		});
		expect(confirm).toHaveTextContent(
			"12 requests use it. They keep it, and it still shows on them."
		);
		await user.click(
			within(confirm).getByRole("button", { name: "Deactivate" })
		);

		await waitFor(() => {
			expect(
				calls.find(
					(call) =>
						call.method === "PUT" && call.path === `${LEAVE_TYPES}/lt-annual`
				)?.body
			).toEqual({
				name: "Annual leave",
				grantKind: "ALLOWANCE",
				paid: true,
				requiresReason: false,
				allowsPartDays: true,
				appliesToBranchIds: [],
				appliesToDepartmentIds: [],
				status: "INACTIVE",
			});
		});
		expect(await screen.findByText("Annual leave deactivated")).toBeVisible();
	});

	it("explains why the last type people can apply for stays active", async () => {
		stubApi(
			routes(READ_AND_UPDATE, {
				[`PUT ${LEAVE_TYPES}/lt-annual`]: problemReply(
					409,
					"LAST_ACTIVE_LEAVE_TYPE"
				),
			})
		);
		const user = userEvent.setup();
		const panel = await open();

		await user.click(
			await within(panel).findByRole("button", {
				name: "More actions for Annual leave",
			})
		);
		await user.click(
			await screen.findByRole("menuitem", { name: "Deactivate" })
		);
		const confirm = await screen.findByRole("dialog", {
			name: "Deactivate Annual leave?",
		});
		await user.click(
			within(confirm).getByRole("button", { name: "Deactivate" })
		);

		expect(
			await within(confirm).findByText(
				"It’s the only leave type people can apply for. Add or activate another one first."
			)
		).toBeVisible();
	});

	it("activates an inactive type again", async () => {
		const calls = stubApi(
			routes(READ_AND_UPDATE, {
				[`PUT ${LEAVE_TYPES}/lt-study`]: {
					status: 200,
					body: envelope({
						...LEAVE_TYPE_CATALOGUE_FIXTURE[3],
						status: "ACTIVE",
					}),
				},
			})
		);
		const user = userEvent.setup();
		const panel = await open();

		await user.click(
			await within(panel).findByRole("button", {
				name: "More actions for Study leave",
			})
		);
		await user.click(await screen.findByRole("menuitem", { name: "Activate" }));
		const confirm = await screen.findByRole("dialog", {
			name: "Activate Study leave?",
		});
		await user.click(within(confirm).getByRole("button", { name: "Activate" }));

		await waitFor(() => {
			expect(
				calls.find(
					(call) =>
						call.method === "PUT" && call.path === `${LEAVE_TYPES}/lt-study`
				)?.body
			).toMatchObject({ status: "ACTIVE", grantKind: "UNTRACKED" });
		});
	});

	it("adds a type from the page, then reloads the list and says so", async () => {
		const calls = stubApi(
			routes(READ_AND_UPDATE, {
				[`POST ${LEAVE_TYPES}`]: {
					status: 201,
					body: envelope(
						managedLeaveTypeFixture({
							leaveTypeId: "lt-new",
							name: "Study leave",
						})
					),
				},
			})
		);
		const user = userEvent.setup();
		const panel = await open();
		await within(panel).findByRole("table", { name: "Yearly allowance" });
		const readsBefore = catalogueReads(calls);

		await user.click(
			within(panel).getByRole("button", { name: "Add leave type" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Add leave type",
		});
		await user.type(within(dialog).getByLabelText("Name"), "Exam leave");
		await user.click(
			within(dialog).getByRole("button", { name: "Add leave type" })
		);

		expect(await screen.findByText("Leave type added")).toBeVisible();
		await waitFor(() => {
			expect(catalogueReads(calls)).toBeGreaterThan(readsBefore);
		});
	});

	it("edits an inactive type and keeps it inactive", async () => {
		const calls = stubApi(
			routes(READ_AND_UPDATE, {
				[`PUT ${LEAVE_TYPES}/lt-study`]: {
					status: 200,
					body: envelope(LEAVE_TYPE_CATALOGUE_FIXTURE[3]),
				},
			})
		);
		const user = userEvent.setup();
		const panel = await open();

		await user.click(
			await within(panel).findByRole("button", { name: "Edit Study leave" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Edit leave type",
		});
		await user.click(within(dialog).getByRole("checkbox", { name: /Paid/ }));
		await user.click(within(dialog).getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(
				calls.find(
					(call) =>
						call.method === "PUT" && call.path === `${LEAVE_TYPES}/lt-study`
				)?.body
			).toEqual({
				name: "Study leave",
				grantKind: "UNTRACKED",
				paid: true,
				requiresReason: true,
				allowsPartDays: true,
				appliesToBranchIds: [],
				appliesToDepartmentIds: [],
				status: "INACTIVE",
			});
		});
	});

	it("keeps focus on the arrows after a move and announces where the type went", async () => {
		stubApi(
			routes(READ_AND_UPDATE, {
				[`GET ${LEAVE_TYPES}`]: [
					{ status: 200, body: envelope(LEAVE_TYPE_CATALOGUE_FIXTURE) },
					{ status: 200, body: envelope(SICK_FIRST) },
				],
				[`PUT ${LEAVE_TYPES}/order`]: {
					status: 200,
					body: envelope(SICK_FIRST),
				},
			})
		);
		const user = userEvent.setup();
		const panel = await open();

		await user.click(
			await within(panel).findByRole("button", { name: "Move Sick leave up" })
		);

		expect(
			await screen.findByText(
				"Sick leave moved to place 1 in Yearly allowance."
			)
		).toBeVisible();
		// Sick leave is now first, so its up arrow can't move it further and focus moves to its down arrow.
		await waitFor(() => {
			expect(
				within(panel).getByRole("button", { name: "Move Sick leave down" })
			).toHaveFocus();
		});
		const rows = within(
			within(panel).getByRole("table", { name: "Yearly allowance" })
		)
			.getAllByRole("row")
			.slice(1);
		expect(rows[0]).toHaveTextContent("Sick leave");
	});

	it("reloads the list after a refused move, so the next one starts from what is saved", async () => {
		const calls = stubApi(
			routes(READ_AND_UPDATE, {
				[`PUT ${LEAVE_TYPES}/order`]: problemReply(
					400,
					"INVALID_LEAVE_TYPE_ORDER"
				),
			})
		);
		const user = userEvent.setup();
		const panel = await open();
		await within(panel).findByRole("table", { name: "Yearly allowance" });
		const readsBefore = catalogueReads(calls);

		await user.click(
			within(panel).getByRole("button", { name: "Move Sick leave up" })
		);

		expect(await within(panel).findByRole("alert")).toHaveTextContent(
			"The list had changed, so it has been refreshed. Try again."
		);
		await waitFor(() => {
			expect(catalogueReads(calls)).toBeGreaterThan(readsBefore);
		});
	});
});
