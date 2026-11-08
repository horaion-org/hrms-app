import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
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
import type { ApprovalInstance } from "@/features/approvals/api";
import {
	approvalInstanceFixture,
	atStepTwoFixture,
	rejectedAtEndorseFixture,
	SITI,
} from "@/features/approvals/fixtures";
import type { Schedule } from "@/features/scheduling/schedules/api";
import {
	generatedScheduleFixture,
	scheduleAssignmentsFixture,
	schedulingWorkspace,
} from "@/features/scheduling/schedules/fixtures";

/*
 * Approvals on the roster page, through the stubbed API: the header's one
 * button follows where the viewer stands, the meta line says where the
 * submission is, and "Approval ›" opens the trail beside the grid.
 */

let app: OpenedApp | undefined;
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

const SCHEDULE =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1";
const SCHEDULE_READ = "/api/v1/companies/c-1/schedules/s-1";
const INSTANCES = "/api/v1/companies/c-1/approval-instances";
const INSTANCE = `${INSTANCES}/ai-1`;
/** The viewer of every test: membership m-c-1. */
const VIEWER = { membershipId: "m-c-1", displayName: "José" };
const MENU = "More actions for Front Office - Week 42";

const ok = (data: unknown): StubReply => ({
	status: 200,
	body: envelope(data),
});

const APPROVER_KEYS = [
	"schedule:read",
	"schedule:publish",
	"approval:read",
	"approval:decide",
];

/** Front Office's schedule s-1, generated, where Endorse → Publish applies. */
const withFlow = (overrides: Partial<Schedule> = {}): Schedule =>
	generatedScheduleFixture({
		status: "GENERATED",
		publication: { requiresApproval: true, stepLabels: ["Endorse", "Publish"] },
		...overrides,
	});

/** What the stubbed API holds now; each test moves it on. */
type World = { schedule: Schedule; instance: ApprovalInstance | null };

const openRoster = async (
	world: World,
	permissions: Array<string>,
	extra: Parameters<typeof stubApi>[0] = {},
	entry = "/scheduling/s-1"
): Promise<ReturnType<typeof stubApi>> => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	const calls = stubApi({
		"POST /api/v1/public/sessions/refreshes": accessPassReply(),
		"GET /api/v1/me": currentUserReply(),
		"GET /api/v1/me/workspace": ok(schedulingWorkspace(permissions)),
		[`GET ${SCHEDULE_READ}`]: () => ok(world.schedule),
		[`GET ${SCHEDULE}/assignments`]: ok(scheduleAssignmentsFixture()),
		[`GET ${INSTANCES}`]: () => ok(world.instance ? [world.instance] : []),
		[`GET ${INSTANCE}`]: () =>
			world.instance
				? ok(world.instance)
				: problemReply(404, "APPROVAL_INSTANCE_NOT_FOUND"),
		...extra,
	});
	app = await openApp(entry);
	renderAuthApp(app);
	return calls;
};

const posts = (
	calls: ReturnType<typeof stubApi>
): Array<{ path: string; body: unknown }> =>
	calls
		.filter((call) => call.method === "POST" && !call.path.includes("sessions"))
		.map(({ path, body }) => ({ path, body }));

it("submits where a flow applies, then says it waits and lets the submitter see the trail and withdraw", async () => {
	const world: World = { schedule: withFlow(), instance: null };
	const calls = await openRoster(world, APPROVER_KEYS, {
		[`POST ${SCHEDULE}/approval`]: () => {
			world.instance = approvalInstanceFixture({
				requestedBy: VIEWER,
				canDecide: false,
				eligibleCount: 2,
			});
			return ok(world.schedule);
		},
		"POST /api/v1/companies/c-1/me/approval-instances/ai-1/cancellation":
			() => {
				world.instance = null;
				return ok(approvalInstanceFixture({ status: "CANCELLED" }));
			},
	});
	const user = userEvent.setup();

	expect(
		await screen.findByText("Needs approval: Endorse → Publish")
	).toBeInTheDocument();
	expect(screen.queryByRole("button", { name: "Publish roster" })).toBeNull();
	await user.click(screen.getByRole("button", { name: "Submit for approval" }));
	const dialog = screen.getByRole("dialog", {
		name: "Submit this roster for approval?",
	});
	expect(dialog).toHaveTextContent("It goes through Endorse → Publish");
	await user.click(
		within(dialog).getByRole("button", { name: "Submit for approval" })
	);

	expect(
		await screen.findByText("Waiting for approval · step 1 of 2 (Endorse)")
	).toBeInTheDocument();
	expect(
		screen.getByText("Sent for approval. Endorse (step 1 of 2) is asked first.")
	).toHaveAttribute("role", "status");
	expect(document.activeElement).toHaveTextContent(
		"Waiting for approval · step 1 of 2 (Endorse)"
	);
	expect(
		screen.queryByRole("button", { name: "Submit for approval" })
	).toBeNull();
	expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
	await user.click(screen.getByRole("button", { name: "Open the approval" }));
	const panel = screen.getByRole("complementary", { name: "Approval" });
	expect(panel).toHaveTextContent("Submitted by José");
	expect(within(panel).getAllByRole("listitem")[0]).toHaveTextContent(
		"Waiting on 2 people"
	);

	await user.click(screen.getByRole("button", { name: MENU }));
	const items = screen.getAllByRole("menuitem").map((item) => item.textContent);
	expect(items).toContain("Withdraw from approval");
	expect(items).not.toContain("Reject");
	await user.click(
		screen.getByRole("menuitem", { name: "Withdraw from approval" })
	);
	await user.click(
		within(
			screen.getByRole("dialog", {
				name: "Withdraw this roster from approval?",
			})
		).getByRole("button", { name: "Withdraw" })
	);

	expect(
		await screen.findByRole("button", { name: "Submit for approval" })
	).toBeInTheDocument();
	expect(posts(calls).map((call) => call.path)).toEqual([
		`${SCHEDULE}/approval`,
		"/api/v1/companies/c-1/me/approval-instances/ai-1/cancellation",
	]);
});

it("writes the trail's times day first on a 24-hour clock, in the roster's zone, in a British browser", async () => {
	vi.spyOn(navigator, "languages", "get").mockReturnValue(["en-GB"]);
	const world: World = {
		schedule: withFlow(),
		instance: approvalInstanceFixture({ canDecide: false }),
	};
	await openRoster(world, APPROVER_KEYS);
	const user = userEvent.setup();

	await user.click(
		await screen.findByRole("button", { name: "Open the approval" })
	);

	// Submitted at 10:02 UTC: 18:02 on the Singapore roster's clock.
	expect(
		screen.getByRole("complementary", { name: "Approval" })
	).toHaveTextContent("9 Oct 2026, 18:02");
});

it("lets the approver approve step 1 with a comment, then approve and publish step 2", async () => {
	const world: World = {
		schedule: withFlow(),
		instance: approvalInstanceFixture({ canDecide: true }),
	};
	const calls = await openRoster(world, APPROVER_KEYS, {
		[`POST ${INSTANCE}/decisions`]: (call) => {
			const { stepOrder } = call.body as { stepOrder: number };
			if (stepOrder === 1)
				world.instance = atStepTwoFixture({ canDecide: true });
			else {
				world.instance = atStepTwoFixture({
					status: "APPROVED",
					currentStepOrder: null,
					canDecide: null,
				});
				world.schedule = withFlow({
					status: "PUBLISHED",
					decidedAt: "2026-10-10T02:00:00Z",
					decidedBy: VIEWER,
				});
			}
			return ok(world.instance);
		},
	});
	const user = userEvent.setup();

	expect(
		await screen.findByText("Waiting on you · step 1 of 2 (Endorse)")
	).toBeInTheDocument();
	await user.click(screen.getByRole("button", { name: "Approve" }));
	let dialog = screen.getByRole("dialog", {
		name: "Approve the Front Office roster?",
	});
	expect(dialog).toHaveTextContent(
		"Step 1 of 2. After you approve, Publish (step 2) is asked next."
	);
	await user.type(
		within(dialog).getByRole("textbox", { name: "Comment (optional)" }),
		"Covered by Ahmad on Sat."
	);
	await user.click(
		within(dialog).getByRole("button", { name: "Confirm approval" })
	);

	expect(
		await screen.findByText("You approved Endorse. Publish (step 2) is next.")
	).toHaveAttribute("role", "status");
	await user.click(
		await screen.findByRole("button", { name: "Approve and publish" })
	);
	expect(
		screen.getByText("Waiting on you · step 2 of 2 (Publish)")
	).toBeInTheDocument();
	dialog = screen.getByRole("dialog", {
		name: "Approve and publish the Front Office roster?",
	});
	// The last step's button names the outcome (addendum C4).
	await user.click(
		within(dialog).getByRole("button", { name: "Approve and publish" })
	);

	expect(await screen.findByText("Published")).toBeInTheDocument();
	// One status message, and focus on the approval line, not a new button (C5).
	expect(
		screen.getByText("You approved and published the Front Office roster.")
	).toHaveAttribute("role", "status");
	expect(document.activeElement).toHaveTextContent("Approval ›");
	expect(
		screen.queryByRole("button", { name: "Approve and publish" })
	).toBeNull();
	expect(posts(calls)).toEqual([
		{
			path: `${INSTANCE}/decisions`,
			body: {
				stepOrder: 1,
				decision: "APPROVE",
				comment: "Covered by Ahmad on Sat.",
			},
		},
		{
			path: `${INSTANCE}/decisions`,
			body: { stepOrder: 2, decision: "APPROVE", comment: null },
		},
	]);
});

it("rejects at the open step with a required reason, and the callout names the step", async () => {
	const world: World = {
		schedule: withFlow(),
		instance: approvalInstanceFixture({ canDecide: true }),
	};
	const calls = await openRoster(world, APPROVER_KEYS, {
		[`POST ${INSTANCE}/decisions`]: () => {
			world.instance = rejectedAtEndorseFixture();
			world.schedule = withFlow({
				status: "REJECTED",
				decidedAt: "2026-10-10T01:10:00Z",
				decidedBy: SITI,
				rejectionReason: "Two nights have no supervisor.",
			});
			return ok(world.instance);
		},
	});
	const user = userEvent.setup();

	await user.click(await screen.findByRole("button", { name: MENU }));
	await user.click(screen.getByRole("menuitem", { name: "Reject" }));
	const dialog = screen.getByRole("dialog", { name: "Reject at Endorse?" });
	await user.click(
		within(dialog).getByRole("button", { name: "Confirm rejection" })
	);
	expect(within(dialog).getByRole("alert")).toHaveTextContent(
		"Enter a reason for rejection."
	);
	await user.type(
		within(dialog).getByRole("textbox", { name: "Reason for rejection" }),
		"Two nights have no supervisor."
	);
	await user.click(
		within(dialog).getByRole("button", { name: "Confirm rejection" })
	);

	expect(
		await screen.findByText(/^Rejected at Endorse by Siti Rahman · /)
	).toBeInTheDocument();
	expect(posts(calls)).toEqual([
		{
			path: `${INSTANCE}/decisions`,
			body: {
				stepOrder: 1,
				decision: "REJECT",
				comment: "Two nights have no supervisor.",
			},
		},
	]);
});

it("says someone else decided first when the step closed meanwhile", async () => {
	const world: World = {
		schedule: withFlow(),
		instance: approvalInstanceFixture({ canDecide: true }),
	};
	await openRoster(world, APPROVER_KEYS, {
		[`POST ${INSTANCE}/decisions`]: problemReply(
			409,
			"APPROVAL_STEP_ALREADY_DECIDED"
		),
	});
	const user = userEvent.setup();

	await user.click(await screen.findByRole("button", { name: "Approve" }));
	const dialog = screen.getByRole("dialog");
	await user.click(
		within(dialog).getByRole("button", { name: "Confirm approval" })
	);

	expect(await within(dialog).findByRole("alert")).toHaveTextContent(
		"Someone else decided this step first. The page now shows where it stands."
	);
});

it("shows the waiting submission's message when publishing directly is refused", async () => {
	// Without approval:read the page cannot see the submission, so it offers Publish and the API says why not.
	const world: World = {
		schedule: generatedScheduleFixture({ status: "GENERATED" }),
		instance: null,
	};
	await openRoster(world, ["schedule:read", "schedule:publish"], {
		[`POST ${SCHEDULE}/approval`]: problemReply(
			409,
			"SCHEDULE_APPROVAL_PENDING"
		),
	});
	const user = userEvent.setup();

	await user.click(
		await screen.findByRole("button", { name: "Publish roster" })
	);
	const dialog = screen.getByRole("dialog", { name: "Publish this roster?" });
	await user.click(
		within(dialog).getByRole("button", { name: "Publish roster" })
	);

	expect(await within(dialog).findByRole("alert")).toHaveTextContent(
		"This roster is already waiting for approval. Reload the page to see where it stands."
	);
});

it("opens on the approval its link names, and shows nothing of approvals without a flow", async () => {
	const world: World = {
		schedule: withFlow(),
		instance: atStepTwoFixture({ canDecide: false }),
	};
	await openRoster(world, APPROVER_KEYS, {}, "/scheduling/s-1?panel=approval");

	const panel = await screen.findByRole("complementary", { name: "Approval" });
	expect(
		within(panel).getByText("Covered by Ahmad on Sat.")
	).toBeInTheDocument();
	expect(
		screen.getByText("Waiting for approval · step 2 of 2 (Publish)")
	).toBeInTheDocument();
	expect(
		screen.queryByRole("button", { name: "Approve and publish" })
	).toBeNull();
});

it("keeps the page as before for a department without a flow", async () => {
	const world: World = {
		schedule: generatedScheduleFixture({ status: "GENERATED" }),
		instance: null,
	};
	await openRoster(world, APPROVER_KEYS);

	expect(
		await screen.findByRole("button", { name: "Publish roster" })
	).toBeInTheDocument();
	expect(screen.queryByText(/approval/i)).toBeNull();
});
