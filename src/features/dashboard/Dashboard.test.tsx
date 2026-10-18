import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
import { effectiveWorkspace } from "@/common/testing/effectiveWorkspace";
import {
	currentUserReply,
	openApp,
	type OpenedApp,
} from "@/common/testing/openApp";
import {
	accessPassReply,
	envelope,
	stubApi,
	type StubReply,
} from "@/common/testing/stubApi";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";
import { leaveFixture } from "@/features/leave/fixtures";

const REFRESH = "POST /api/v1/public/sessions/refreshes";
const ME = "GET /api/v1/me";
const WORKSPACE = "GET /api/v1/me/workspace";
const LEAVE = "GET /api/v1/companies/c-1/leave-requests";
const AUDIT_EVENTS = "GET /api/v1/companies/c-1/audit-events";
const APPROVE =
	"POST /api/v1/companies/c-1/member-profiles/m-aisha/leave-requests/leave-aisha/approval";

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

const page = (content: Array<unknown>, totalElements: number): StubReply => ({
	status: 200,
	body: envelope({ content, page: { totalElements } }),
});

const workspaceReply = (permissions: Array<string>): StubReply => ({
	status: 200,
	body: envelope(
		effectiveWorkspace({
			companies: [
				{
					uuid: "c-1",
					name: "Company c-1",
					permissions,
					branches: [
						{
							uuid: "b-1",
							name: "Main branch",
							status: "ACTIVE",
							country: "SG",
							permissions: [],
							departments: [
								{
									uuid: "d-1",
									name: "Sales",
									status: "ACTIVE",
									permissions: [],
								},
							],
						},
					],
				},
			],
		})
	),
});

/** Pending: 2 shown of 3; approved 5; rejected 2 — so 70% resolved. */
const leaveByStatus = (call: { search: string }): StubReply => {
	const status = new URLSearchParams(call.search).get("status");
	if (status === "APPROVED") return page([], 5);
	if (status === "REJECTED") return page([], 2);
	return page([leaveFixture({ leaveRequestId: "leave-aisha" })], 3);
};

const routes = (
	permissions: Array<string> = [
		"leave_request:read",
		"leave_request:review",
		"audit_event:read",
	]
): Record<string, StubReply | ((call: { search: string }) => StubReply)> => ({
	[REFRESH]: accessPassReply(),
	[ME]: currentUserReply(),
	[WORKSPACE]: workspaceReply(permissions),
	[LEAVE]: leaveByStatus,
	[AUDIT_EVENTS]: page(
		[
			{
				auditEventId: "e-1",
				action: "member_profile.create",
				entityType: "MemberProfile",
				entityId: "m-1",
				entityName: "Kent Chua",
				actorDisplayName: "Moses Lee",
				occurredAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
			},
		],
		1
	),
});

const open = async (entry = "/"): Promise<OpenedApp> => {
	app = await openApp(entry);
	renderAuthApp(app);
	return app;
};

describe("Dashboard", () => {
	it("given_grants_when_opened_then_showsApprovalsNotificationsAndActivity", async () => {
		stubApi(routes());
		await open();

		await screen.findByRole("heading", { level: 1, name: "Dashboard" });
		const approvals = await screen.findByRole("region", {
			name: "Pending Approvals",
		});
		await within(approvals).findByText("3");
		expect(approvals).toHaveTextContent("70% Resolved");
		const notifications = screen.getByRole("region", { name: "Pending leave requests" });
		expect(
			await within(notifications).findByText("from Aisha Rahman", {
				exact: false,
			})
		).toBeInTheDocument();
		expect(within(notifications).queryByText("Example")).toBeNull();
		expect(
			await screen.findByText("Kent Chua added to People")
		).toBeInTheDocument();
		expect(
			screen.getByRole("list", { name: "Quick Actions" })
		).toBeInTheDocument();
	});

	it("given_aPendingRequest_when_approved_then_confirmsIt", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...routes(),
			[APPROVE]: {
				status: 200,
				body: envelope(
					leaveFixture({ leaveRequestId: "leave-aisha", status: "APPROVED" })
				),
			},
		});
		await open();
		const notifications = await screen.findByRole("region", {
			name: "Pending leave requests",
		});
		await within(notifications).findByText("from Aisha Rahman", {
			exact: false,
		});

		const approve = within(notifications).getAllByRole("button", {
			name: "Approve",
		})[0]!;
		await waitFor(() => {
			expect(approve).toBeEnabled();
		});
		await user.click(approve);

		await waitFor(() => {
			expect(screen.getByRole("status")).toHaveTextContent(
				"Request for Aisha Rahman approved."
			);
		});
		expect(
			calls.filter((call) => `${call.method} ${call.path}` === APPROVE)
		).toHaveLength(1);
	});

	it("given_noGrants_when_opened_then_leavesOutApprovalsAndActivity", async () => {
		const calls = stubApi(routes([]));
		await open();

		await screen.findByRole("region", { name: "Active Workforce" });
		await waitFor(() => {
			expect(
				screen.queryByRole("region", { name: "Pending Approvals" })
			).toBeNull();
		});
		expect(
			screen.queryByRole("region", { name: "Recent Activity" })
		).toBeNull();
		expect(calls.some((call) => call.path.endsWith("/leave-requests"))).toBe(
			false
		);
		expect(calls.some((call) => call.path.endsWith("/audit-events"))).toBe(
			false
		);
	});
});

describe("Recent Activity", () => {
	it("given_activity_when_opened_then_listsItAPageAtATime", async () => {
		const calls = stubApi(routes());
		await open("/activity");

		expect(
			await screen.findByRole("heading", { level: 1, name: "Recent Activity" })
		).toBeVisible();
		expect(
			await screen.findByText("Kent Chua added to People")
		).toBeInTheDocument();
		expect(
			screen.getByText("Kent Chua added to People").closest("li")
		).toHaveTextContent("by Moses Lee");
		const search = calls.find((call) =>
			call.path.endsWith("/audit-events")
		)?.search;
		expect(search).toContain("page=0&size=10");
		expect(search).toContain("entityType=LeaveRequest");
	});
});
