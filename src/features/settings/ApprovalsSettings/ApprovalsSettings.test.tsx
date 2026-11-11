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
	approvalFlowFixture,
	companyFlowFixture,
	leaveFlowFixture,
} from "@/features/approvals/fixtures";

const COMPANY = "/api/v1/companies/c-1";
const FLOWS = `${COMPANY}/approval-flows`;
const ELIGIBLE = `${FLOWS}/eligible-approvers`;
const READ_AND_MANAGE = ["approval_flow:read", "approval_flow:manage"];
/** The test workspace's d-1 is "Kitchen"; the fixture flow sits there. */
const KITCHEN_FLOW = approvalFlowFixture({ name: "Kitchen publishing" });

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

const ok = (data: unknown, status = 200): StubReply => ({
	status,
	body: envelope(data),
});

const routes = (
	permissions: Array<string>,
	flows: Array<unknown>,
	extra: Parameters<typeof stubApi>[0] = {}
): Parameters<typeof stubApi>[0] => ({
	"POST /api/v1/public/sessions/refreshes": accessPassReply(),
	"GET /api/v1/me": currentUserReply(),
	"GET /api/v1/me/workspace": ok(companyWideWorkspace(permissions)),
	[`GET ${FLOWS}`]: ok(flows),
	[`GET ${ELIGIBLE}`]: ok({
		content: [
			{ membershipId: "m-3", displayName: "Siti Rahman", status: "ACTIVE" },
		],
		page: { totalElements: 1 },
	}),
	...extra,
});

const open = async (): Promise<HTMLElement> => {
	app = await openApp("/settings?section=approvals");
	renderAuthApp(app);
	return screen.findByRole("tabpanel", { name: "Approvals" });
};

describe("ApprovalsSettings", () => {
	it("lists each subject's flows in its own group, with where each applies, its steps and whether it is on", async () => {
		stubApi(
			routes(READ_AND_MANAGE, [
				companyFlowFixture(),
				{ ...KITCHEN_FLOW, active: false },
				leaveFlowFixture(),
			])
		);

		const panel = await open();
		const rosters = await within(panel).findByRole("table", {
			name: "Roster publishing",
		});
		const [, company, kitchen] = within(rosters).getAllByRole("row");
		// Each cell's own content: on phones the first cell adds a line with the steps after it.
		const cellsOf = (row: HTMLElement | undefined): Array<string | undefined> =>
			within(row!)
				.getAllByRole("cell")
				.map((cell) => cell.firstChild?.textContent ?? undefined);
		expect(cellsOf(company).slice(0, 3)).toEqual([
			"Company default",
			"1 Publish",
			"On",
		]);
		expect(cellsOf(kitchen).slice(0, 3)).toEqual([
			"Kitchen",
			"1 Endorse (all of 2) → 2 Publish",
			"Off",
		]);
		// Below xl (phones, and tablets beside Settings' tabs) the table keeps where it applies and the actions;
		// the steps and whether it is on move to the first cell's line.
		for (const name of ["Steps", "Status"])
			expect(within(rosters).getByRole("columnheader", { name })).toHaveClass(
				"hidden",
				"xl:table-cell"
			);
		const [stepsOnLine, stepsCell] = within(
			kitchen as HTMLElement
		).getAllByText(/Endorse/);
		expect(stepsCell).toHaveClass("hidden", "xl:table-cell");
		expect(stepsOnLine).toHaveClass("xl:hidden");
		expect(within(kitchen as HTMLElement).getAllByText("Off")).toHaveLength(2);
		expect(
			within(rosters).getByRole("columnheader", { name: "Applies to" })
		).not.toHaveClass("hidden");
		const leave = within(panel).getByRole("table", { name: "Leave requests" });
		const leaveRows = within(leave).getAllByRole("row");
		expect(leaveRows).toHaveLength(2);
		expect(cellsOf(leaveRows[1]).slice(0, 3)).toEqual([
			"Company default",
			"1 Manager → 2 HR",
			"On",
		]);
		// Rosters have a department flow beside the default; leave has only the default.
		expect(
			within(panel).getByText(
				"Other departments, and any whose flow is off, use the company default."
			)
		).toBeInTheDocument();
		expect(
			within(panel).getByText("Every department uses the company default.")
		).toBeInTheDocument();
		expect(
			within(panel).getByRole("button", { name: "Add flow Roster publishing" })
		).toBeInTheDocument();
		expect(
			within(panel).getByRole("button", { name: "Add flow Leave requests" })
		).toBeInTheDocument();
	});

	it("says each subject is decided in one step without a flow, and offers no change to a reader", async () => {
		stubApi(routes(["approval_flow:read"], []));

		const panel = await open();
		expect(
			await within(panel).findByText(
				"No approval flow. Rosters publish in one step, by anyone who can publish them."
			)
		).toBeInTheDocument();
		expect(
			within(panel).getByText(
				"No approval flow. Leave is approved or rejected in one step, by anyone who can review it."
			)
		).toBeInTheDocument();
		expect(within(panel).queryByRole("table")).toBeNull();
		expect(
			within(panel).queryByRole("button", { name: /Add flow/ })
		).toBeNull();
	});

	it("says departments outside a subject's flows decide in one step when no company default is on", async () => {
		stubApi(routes(["approval_flow:read"], [KITCHEN_FLOW]));

		const panel = await open();
		expect(
			await within(panel).findByText(
				"Other departments, and any whose flow is off: one step, by anyone who can publish their roster."
			)
		).toBeInTheDocument();
	});

	it("hides the section from someone without approval_flow:read", async () => {
		stubApi(routes(["leave_type:read"], []));
		app = await openApp("/settings");
		renderAuthApp(app);

		await screen.findByRole("tab", { name: /Leave/ });
		expect(screen.queryByRole("tab", { name: /Approvals/ })).toBeNull();
	});

	it("adds a flow: names its steps, asks for people where only named people decide, then posts it", async () => {
		const calls = stubApi(
			routes(READ_AND_MANAGE, [], {
				[`POST ${FLOWS}`]: ok(KITCHEN_FLOW, 201),
			})
		);
		const user = userEvent.setup();

		const panel = await open();
		await user.click(
			await within(panel).findByRole("button", {
				name: "Add flow Roster publishing",
			})
		);
		const dialog = screen.getByRole("dialog", {
			name: "Add roster approval flow",
		});
		expect(within(dialog).getByRole("textbox", { name: "Name" })).toHaveValue(
			"Company roster approval"
		);

		await user.click(within(dialog).getByRole("button", { name: "Save flow" }));
		expect(
			await within(dialog).findByText("Name this step.")
		).toBeInTheDocument();
		await user.type(within(dialog).getByLabelText(/Name of step 1/), "Endorse");
		await user.click(
			within(dialog).getByRole("radio", { name: "Only these people" })
		);
		expect(dialog).toHaveTextContent(
			"Only people with “Publish or reject rosters” and “Approve or reject a step” in at least one department are listed."
		);
		await user.click(within(dialog).getByRole("button", { name: "Save flow" }));
		expect(
			await within(dialog).findByText("Choose at least one person.")
		).toBeInTheDocument();

		await user.click(within(dialog).getByLabelText("People"));
		await user.click(
			await screen.findByRole("option", { name: "Siti Rahman" })
		);
		const eligibleQuery = new URLSearchParams(
			calls.find((call) => call.path === ELIGIBLE)?.search
		);
		expect(eligibleQuery.get("subjectType")).toBe("SCHEDULE_PUBLICATION");
		expect(eligibleQuery.has("departmentId")).toBe(false);
		await user.keyboard("{Escape}");
		await user.click(
			within(dialog).getByRole("radio", { name: "All of them" })
		);
		expect(
			within(dialog).queryByRole("checkbox", {
				name: "A different person approves each step",
			})
		).toBeNull();
		await user.click(within(dialog).getByRole("button", { name: "Add step" }));
		await user.type(within(dialog).getByLabelText(/Name of step 2/), "Publish");
		await user.click(
			within(dialog).getByRole("checkbox", {
				name: "A different person approves each step",
			})
		);
		await user.click(within(dialog).getByRole("button", { name: "Add step" }));
		expect(within(dialog).getByText("Up to 3 steps.")).toBeInTheDocument();
		expect(
			within(dialog).queryByRole("button", { name: "Add step" })
		).toBeNull();
		await user.click(
			within(dialog).getByRole("button", { name: "Remove step 3" })
		);
		await user.click(within(dialog).getByRole("button", { name: "Save flow" }));

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).toBeNull();
		});
		expect(
			calls.find((call) => call.method === "POST" && call.path === FLOWS)?.body
		).toEqual({
			subjectType: "SCHEDULE_PUBLICATION",
			departmentId: null,
			name: "Company roster approval",
			steps: [
				{
					label: "Endorse",
					rule: "MEMBERS",
					quorum: "ALL",
					memberIds: ["m-3"],
				},
				{ label: "Publish", rule: "KEY_HOLDERS", quorum: "ANY", memberIds: [] },
			],
			distinctApprovers: true,
		});
	});

	it("adds a leave flow from the leave group, worded for reviewing leave", async () => {
		const calls = stubApi(
			routes(READ_AND_MANAGE, [], {
				[`POST ${FLOWS}`]: ok(leaveFlowFixture(), 201),
			})
		);
		const user = userEvent.setup();

		const panel = await open();
		await user.click(
			await within(panel).findByRole("button", {
				name: "Add flow Leave requests",
			})
		);
		const dialog = screen.getByRole("dialog", {
			name: "Add leave approval flow",
		});
		expect(within(dialog).getByRole("textbox", { name: "Name" })).toHaveValue(
			"Company leave approval"
		);
		expect(
			within(dialog).getByRole("radio", {
				name: /^Anyone who can review the leave/,
			})
		).toBeChecked();
		expect(dialog).toHaveTextContent(
			"Approvers need “Review leave” and “Decide approvals”"
		);
		await user.type(within(dialog).getByLabelText(/Name of step 1/), "Manager");
		await user.click(within(dialog).getByRole("button", { name: "Save flow" }));

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).toBeNull();
		});
		expect(
			calls.find((call) => call.method === "POST" && call.path === FLOWS)?.body
		).toMatchObject({ subjectType: "LEAVE_REQUEST", distinctApprovers: false });
	});

	it("clears the named people when Applies to changes, and lists the new department's approvers", async () => {
		const calls = stubApi(routes(READ_AND_MANAGE, []));
		const user = userEvent.setup();

		const panel = await open();
		await user.click(
			await within(panel).findByRole("button", {
				name: "Add flow Roster publishing",
			})
		);
		const dialog = screen.getByRole("dialog", {
			name: "Add roster approval flow",
		});
		await user.click(
			within(dialog).getByRole("radio", { name: "Only these people" })
		);
		await user.click(within(dialog).getByLabelText("People"));
		await user.click(
			await screen.findByRole("option", { name: "Siti Rahman" })
		);
		await user.keyboard("{Escape}");
		expect(within(dialog).getByText("Siti Rahman")).toBeInTheDocument();

		await user.click(within(dialog).getByLabelText("Applies to"));
		await user.click(await screen.findByRole("option", { name: /Kitchen/ }));

		expect(within(dialog).queryByText("Siti Rahman")).toBeNull();
		expect(dialog).toHaveTextContent(
			"Only people with “Publish or reject rosters” and “Approve or reject a step” in Kitchen are listed. If someone is missing, give them both permissions in Access roles first."
		);
		await waitFor(() => {
			expect(
				calls.some(
					(call) =>
						call.path === ELIGIBLE &&
						new URLSearchParams(call.search).get("departmentId") === "d-1"
				)
			).toBe(true);
		});
	});

	it("words the people hint for leave reviewers", async () => {
		stubApi(routes(READ_AND_MANAGE, []));
		const user = userEvent.setup();

		const panel = await open();
		await user.click(
			await within(panel).findByRole("button", {
				name: "Add flow Leave requests",
			})
		);
		const dialog = screen.getByRole("dialog", {
			name: "Add leave approval flow",
		});
		await user.click(
			within(dialog).getByRole("radio", { name: "Only these people" })
		);

		expect(dialog).toHaveTextContent(
			"Only people with “Approve or reject leave” and “Approve or reject a step” in at least one department are listed."
		);
	});

	it("moves a step with its arrows and says so", async () => {
		const calls = stubApi(
			routes(READ_AND_MANAGE, [companyFlowFixture()], {
				[`PUT ${FLOWS}/af-0`]: ok(companyFlowFixture()),
			})
		);
		const user = userEvent.setup();

		const panel = await open();
		await user.click(
			await within(panel).findByRole("button", {
				name: "Edit Company publishing",
			})
		);
		const dialog = screen.getByRole("dialog", {
			name: "Edit roster approval flow",
		});
		await user.click(within(dialog).getByRole("button", { name: "Add step" }));
		await user.type(within(dialog).getByLabelText(/Name of step 2/), "Endorse");
		await user.click(
			within(dialog).getByRole("button", { name: "Move step 2 up" })
		);

		expect(
			within(dialog).getByText("Step 2 moved, now step 1.")
		).toBeInTheDocument();
		expect(within(dialog).getByLabelText(/Name of step 1/)).toHaveValue(
			"Endorse"
		);
		await user.click(within(dialog).getByRole("button", { name: "Save flow" }));
		await waitFor(() => {
			expect(screen.queryByRole("dialog")).toBeNull();
		});
		const sent = calls.find((call) => call.method === "PUT")?.body as {
			active: boolean;
			steps: Array<{ label: string }>;
		};
		expect(sent.active).toBe(true);
		expect(sent.steps.map((step) => step.label)).toEqual([
			"Endorse",
			"Publish",
		]);
	});

	it("names a department's roster without a possessive in Who decides", async () => {
		stubApi(routes(READ_AND_MANAGE, [KITCHEN_FLOW]));
		const user = userEvent.setup();

		const panel = await open();
		await user.click(
			await within(panel).findByRole("button", {
				name: "Edit Kitchen publishing",
			})
		);
		const dialog = screen.getByRole("dialog", {
			name: "Edit roster approval flow",
		});

		expect(
			within(dialog).getAllByRole("radio", {
				name: /^Anyone who can publish the Kitchen roster/,
			})
		).not.toHaveLength(0);
		expect(within(dialog).queryByText(/Kitchen’s roster/)).toBeNull();
		// People saved on the flow stay chosen when it is edited; the hint names its department.
		expect(within(dialog).getByText("Siti Rahman")).toBeInTheDocument();
		expect(within(dialog).getByText("Ahmad Ali")).toBeInTheDocument();
		expect(dialog).toHaveTextContent(
			"Only people with “Publish or reject rosters” and “Approve or reject a step” in Kitchen are listed."
		);
	});

	it("puts a unit that already has a flow on its field", async () => {
		stubApi(
			routes(READ_AND_MANAGE, [], {
				[`POST ${FLOWS}`]: problemReply(409, "APPROVAL_FLOW_ALREADY_EXISTS"),
			})
		);
		const user = userEvent.setup();

		const panel = await open();
		await user.click(
			await within(panel).findByRole("button", {
				name: "Add flow Roster publishing",
			})
		);
		const dialog = screen.getByRole("dialog", {
			name: "Add roster approval flow",
		});
		await user.type(within(dialog).getByLabelText(/Name of step 1/), "Publish");
		await user.click(within(dialog).getByRole("button", { name: "Save flow" }));

		expect(
			await within(dialog).findByText(
				"This already has an approval flow. Edit that one instead."
			)
		).toBeInTheDocument();
	});

	it("turns a flow off after saying rosters already waiting keep it", async () => {
		const calls = stubApi(
			routes(READ_AND_MANAGE, [KITCHEN_FLOW], {
				[`PUT ${FLOWS}/af-1`]: ok({ ...KITCHEN_FLOW, active: false }),
			})
		);
		const user = userEvent.setup();

		const panel = await open();
		await user.click(
			await within(panel).findByRole("button", {
				name: "More actions for Kitchen publishing",
			})
		);
		await user.click(screen.getByRole("menuitem", { name: "Turn off" }));
		const dialog = screen.getByRole("dialog", {
			name: "Turn off Kitchen publishing?",
		});
		expect(dialog).toHaveTextContent("Rosters already waiting keep this flow.");
		await user.click(within(dialog).getByRole("button", { name: "Turn off" }));

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).toBeNull();
		});
		expect(calls.find((call) => call.method === "PUT")?.body).toEqual({
			name: "Kitchen publishing",
			active: false,
			steps: [
				{
					label: "Endorse",
					rule: "MEMBERS",
					quorum: "ALL",
					memberIds: ["m-4", "m-3"],
				},
				{ label: "Publish", rule: "KEY_HOLDERS", quorum: "ANY", memberIds: [] },
			],
			distinctApprovers: false,
		});
	});

	it("words a leave flow's turning off for leave requests", async () => {
		stubApi(routes(READ_AND_MANAGE, [leaveFlowFixture()]));
		const user = userEvent.setup();

		const panel = await open();
		await user.click(
			await within(panel).findByRole("button", {
				name: "More actions for Company leave approval",
			})
		);
		await user.click(screen.getByRole("menuitem", { name: "Turn off" }));
		expect(
			screen.getByRole("dialog", { name: "Turn off Company leave approval?" })
		).toHaveTextContent(
			"Requests already waiting keep this flow. Leave applied for from now on doesn’t go through it."
		);
	});

	it("names the departments and steps nobody can approve when a flow is saved", async () => {
		stubApi(
			routes(READ_AND_MANAGE, [], {
				[`POST ${FLOWS}`]: {
					status: 400,
					body: {
						status: 400,
						title: "Refused",
						errorCode: "APPROVAL_FLOW_HAS_NO_APPROVER",
						departments: [
							{
								departmentId: "d-1",
								departmentName: "Kitchen",
								stepOrders: [1],
							},
						],
					},
				},
			})
		);
		const user = userEvent.setup();

		const panel = await open();
		await user.click(
			await within(panel).findByRole("button", {
				name: "Add flow Leave requests",
			})
		);
		const dialog = screen.getByRole("dialog", {
			name: "Add leave approval flow",
		});
		await user.type(within(dialog).getByLabelText(/Name of step 1/), "Manager");
		await user.click(within(dialog).getByRole("button", { name: "Save flow" }));

		expect(
			await within(dialog).findByText(
				"Nobody can approve step 1 in Kitchen. Give people “Decide approvals” there in Access roles, or change the step."
			)
		).toBeInTheDocument();
	});
});
