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
} from "@/features/approvals/fixtures";

const COMPANY = "/api/v1/companies/c-1";
const FLOWS = `${COMPANY}/approval-flows`;
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
	[`GET ${COMPANY}/me/colleagues`]: ok({
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
	it("lists each flow with where it applies, its steps and whether it is on", async () => {
		stubApi(
			routes(READ_AND_MANAGE, [
				companyFlowFixture(),
				{ ...KITCHEN_FLOW, active: false },
			])
		);

		const panel = await open();
		const table = await within(panel).findByRole("table", {
			name: "Schedule publishing",
		});
		const [, company, kitchen] = within(table).getAllByRole("row");
		expect(company).toHaveTextContent("Whole company1 PublishOn");
		expect(kitchen).toHaveTextContent(
			"Kitchen1 Endorse (all of 2) → 2 PublishOff"
		);
		expect(
			within(panel).getByRole("button", { name: "Add flow" })
		).toBeInTheDocument();
	});

	it("says publishing stays one click without a flow, and offers no change to a reader", async () => {
		stubApi(routes(["approval_flow:read"], []));

		const panel = await open();
		expect(
			await within(panel).findByText(
				"No approval flows. Rosters publish in one step, by anyone who can publish."
			)
		).toBeInTheDocument();
		expect(
			within(panel).queryByRole("button", { name: "Add flow" })
		).toBeNull();
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
			await within(panel).findByRole("button", { name: "Add flow" })
		);
		const dialog = screen.getByRole("dialog", { name: "Add approval flow" });
		expect(within(dialog).getByRole("textbox", { name: "Name" })).toHaveValue(
			"Whole company publishing"
		);

		await user.click(within(dialog).getByRole("button", { name: "Save flow" }));
		expect(
			await within(dialog).findByText("Name this step.")
		).toBeInTheDocument();
		await user.type(within(dialog).getByLabelText(/Name of step 1/), "Endorse");
		await user.click(
			within(dialog).getByRole("radio", { name: "Only these people" })
		);
		await user.click(within(dialog).getByRole("button", { name: "Save flow" }));
		expect(
			await within(dialog).findByText("Choose at least one person.")
		).toBeInTheDocument();

		await user.click(within(dialog).getByLabelText("People"));
		await user.click(
			await screen.findByRole("option", { name: "Siti Rahman" })
		);
		await user.keyboard("{Escape}");
		await user.click(
			within(dialog).getByRole("radio", { name: "All of them" })
		);
		await user.click(within(dialog).getByRole("button", { name: "Add step" }));
		await user.type(within(dialog).getByLabelText(/Name of step 2/), "Publish");
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
			name: "Whole company publishing",
			steps: [
				{
					label: "Endorse",
					rule: "MEMBERS",
					quorum: "ALL",
					memberIds: ["m-3"],
				},
				{ label: "Publish", rule: "KEY_HOLDERS", quorum: "ANY", memberIds: [] },
			],
		});
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
		const dialog = screen.getByRole("dialog", { name: "Edit approval flow" });
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

	it("puts a unit that already has a flow on its field", async () => {
		stubApi(
			routes(READ_AND_MANAGE, [], {
				[`POST ${FLOWS}`]: problemReply(409, "APPROVAL_FLOW_ALREADY_EXISTS"),
			})
		);
		const user = userEvent.setup();

		const panel = await open();
		await user.click(
			await within(panel).findByRole("button", { name: "Add flow" })
		);
		const dialog = screen.getByRole("dialog", { name: "Add approval flow" });
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
		});
	});
});
