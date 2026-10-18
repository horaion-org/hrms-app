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
import { accessPassReply, envelope, stubApi } from "@/common/testing/stubApi";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";
import { leaveFixture } from "@/features/leave/fixtures";

const BASE = "/api/v1/companies/c-1/me/notifications";
const own = {
	notificationId: "notification-1",
	type: "LEAVE_REQUEST_APPROVED",
	leaveRequestId: "leave-1",
	membershipId: "m-c-1",
	occurredAt: "2026-10-18T08:00:00Z",
	createdAt: "2026-10-18T08:00:05Z",
	readAt: null,
};
const review = {
	...own,
	notificationId: "review-1",
	type: "LEAVE_REQUEST_SUBMITTED",
	membershipId: "m-other",
};
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

const open = async (entry = "/notifications"): Promise<void> => {
	app = await openApp(entry);
	renderAuthApp(app);
};

describe("Notifications", () => {
	it("given_demoPreview_when_markingRead_then_changesOnlyExamplesAndCanReturnToLiveData", async () => {
		const calls = stubApi({
			"POST /api/v1/public/sessions/refreshes": accessPassReply(),
			"GET /api/v1/me": currentUserReply(),
			"GET /api/v1/me/workspace": {
				status: 200,
				body: envelope(companyWideWorkspace([])),
			},
			[`GET ${BASE}`]: {
				status: 200,
				body: { content: [], page: { totalElements: 0 } },
			},
			[`GET ${BASE}/unread-count`]: { status: 200, body: { unreadCount: 0 } },
		});
		await open();
		const user = userEvent.setup();
		await user.click(
			await screen.findByRole("button", { name: "Notifications, 0 unread" })
		);
		const panel = await screen.findByRole("dialog", { name: "Notifications" });
		await user.click(
			within(panel).getByRole("button", { name: "Show demo data" })
		);
		expect(within(panel).getByText("Demo data")).toBeInTheDocument();
		expect(within(panel).getAllByRole("listitem")).toHaveLength(40);
		expect(
			within(panel).queryByRole("link", {
				name: "Your leave request was approved.",
			})
		).toBeNull();
		const unreadButtons = within(panel).getAllByRole("button", {
			name: "Mark as read",
		});
		await user.click(unreadButtons[0]!);
		expect(
			within(panel).getAllByRole("button", { name: "Mark as read" })
		).toHaveLength(unreadButtons.length - 1);
		await user.click(within(panel).getByRole("tab", { name: /Needs review/ }));
		expect(within(panel).getAllByRole("listitem")).toHaveLength(20);
		expect(calls.some((call) => call.method === "PUT")).toBe(false);
		await user.click(
			within(panel).getByRole("button", { name: "Show live notifications" })
		);
		expect(
			await within(panel).findByText("You have no notifications in this view.")
		).toBeInTheDocument();
	});

	it("given_bell_when_opened_then_showsRecentNotificationsWithoutNavigatingAndDismissesOnEscape", async () => {
		const calls = stubApi({
			"POST /api/v1/public/sessions/refreshes": accessPassReply(),
			"GET /api/v1/me": currentUserReply(),
			"GET /api/v1/me/workspace": {
				status: 200,
				body: envelope(companyWideWorkspace([])),
			},
			[`GET ${BASE}`]: {
				status: 200,
				body: { content: [own], page: { totalElements: 1 } },
			},
			[`GET ${BASE}/unread-count`]: { status: 200, body: { unreadCount: 1 } },
			"GET /api/v1/companies/c-1/me/leave-requests": {
				status: 200,
				body: envelope({ content: [], page: { totalElements: 0 } }),
			},
		});
		await open("/leave");
		const user = userEvent.setup();
		const bell = await screen.findByRole("button", {
			name: "Notifications, 1 unread",
		});
		expect(calls.some((call) => call.path === BASE)).toBe(false);
		await user.click(bell);
		const panel = await screen.findByRole("dialog", { name: "Notifications" });
		expect(
			await within(panel).findByText("Your leave request was approved.")
		).toBeInTheDocument();
		expect(app?.router.state.location.pathname).toBe("/leave");
		expect(bell).toHaveAttribute("aria-expanded", "true");
		await user.keyboard("{Escape}");
		await waitFor(() => {
			expect(
				screen.queryByRole("dialog", { name: "Notifications" })
			).toBeNull();
		});
		expect(bell).toHaveFocus();
		await user.click(bell);
		await user.click(
			within(
				await screen.findByRole("dialog", { name: "Notifications" })
			).getByRole("link", { name: "View all notifications" })
		);
		await screen.findByRole("heading", { level: 1, name: "Notifications" });
		expect(screen.queryByRole("dialog", { name: "Notifications" })).toBeNull();
		expect(app?.router.state.location.pathname).toBe("/notifications");
	});

	it("given_unavailableCount_when_bellIsClicked_then_panelStillLoadsAndCanBeClosed", async () => {
		stubApi({
			"POST /api/v1/public/sessions/refreshes": accessPassReply(),
			"GET /api/v1/me": currentUserReply(),
			"GET /api/v1/me/workspace": {
				status: 200,
				body: envelope(companyWideWorkspace([])),
			},
			[`GET ${BASE}`]: {
				status: 200,
				body: { content: [], page: { totalElements: 0 } },
			},
			[`GET ${BASE}/unread-count`]: { status: 503, body: { status: 503 } },
		});
		await open();
		const user = userEvent.setup();
		await user.click(
			await screen.findByRole("button", {
				name: "Notifications, unread count unavailable",
			})
		);
		const panel = await screen.findByRole("dialog", { name: "Notifications" });
		expect(
			await within(panel).findByText("You have no notifications in this view.")
		).toBeInTheDocument();
		await user.click(
			within(panel).getByRole("button", { name: "Close notifications" })
		);
		await waitFor(() => {
			expect(
				screen.queryByRole("dialog", { name: "Notifications" })
			).toBeNull();
		});
	});

	it("given_noGrants_when_acknowledging_then_ownInboxAndCountUpdateWithoutReviewRequests", async () => {
		let read = false;
		const calls = stubApi({
			"POST /api/v1/public/sessions/refreshes": accessPassReply(),
			"GET /api/v1/me": currentUserReply(),
			"GET /api/v1/me/workspace": {
				status: 200,
				body: envelope(companyWideWorkspace([])),
			},
			[`GET ${BASE}`]: () => ({
				status: 200,
				body: {
					content: [{ ...own, readAt: read ? own.createdAt : null }],
					page: { totalElements: 1 },
				},
			}),
			[`GET ${BASE}/unread-count`]: () => ({
				status: 200,
				body: { unreadCount: read ? 0 : 1 },
			}),
			[`PUT ${BASE}/notification-1/read`]: () => {
				read = true;
				return { status: 200, body: { updatedCount: 1 } };
			},
		});
		await open();
		await screen.findByText("Your leave request was approved.");
		expect(screen.queryByRole("tab", { name: "Needs review" })).toBeNull();
		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Mark as read" }));
		await waitFor(() => {
			expect(screen.queryByText("Unread", { exact: true })).toBeNull();
		});
		expect(
			await screen.findByRole("button", { name: "Notifications, 0 unread" })
		).toBeInTheDocument();
		expect(
			calls
				.filter((call) => call.path.startsWith(BASE))
				.every((call) => !call.search.includes("REVIEW"))
		).toBe(true);
	});

	it("given_reviewPermissionWithdrawn_when_workspaceRefreshes_then_discardsReviewRowsButKeepsOwnInbox", async () => {
		stubApi({
			"POST /api/v1/public/sessions/refreshes": accessPassReply(),
			"GET /api/v1/me": currentUserReply(),
			"GET /api/v1/me/workspace": {
				status: 200,
				body: envelope(
					companyWideWorkspace(["leave_request:read", "leave_request:review"])
				),
			},
			[`GET ${BASE}`]: ({ search }) => ({
				status: 200,
				body: {
					content: [search.includes("REVIEW") ? review : own],
					page: { totalElements: 1 },
				},
			}),
			[`GET ${BASE}/unread-count`]: { status: 200, body: { unreadCount: 1 } },
		});
		await open();
		await userEvent
			.setup()
			.click(await screen.findByRole("tab", { name: "Needs review" }));
		await screen.findByText("A leave request needs review.");
		app?.queryClient.setQueryData(["workspace"], companyWideWorkspace([]));
		await waitFor(() => {
			expect(screen.queryByText("A leave request needs review.")).toBeNull();
		});
		expect(
			await screen.findByText("Your leave request was approved.")
		).toBeInTheDocument();
		expect(
			app?.queryClient
				.getQueryCache()
				.findAll({ queryKey: ["notifications", "c-1", "m-c-1", "REVIEW"] })
				.every((query) => query.state.data === undefined)
		).toBe(true);
	});

	it("given_notificationOutsideListPage_when_opened_then_fetchesItsIndividualOwnedRequest", async () => {
		const calls = stubApi({
			"POST /api/v1/public/sessions/refreshes": accessPassReply(),
			"GET /api/v1/me": currentUserReply(),
			"GET /api/v1/me/workspace": {
				status: 200,
				body: envelope(companyWideWorkspace([])),
			},
			[`GET ${BASE}`]: {
				status: 200,
				body: { content: [own], page: { totalElements: 1 } },
			},
			[`GET ${BASE}/unread-count`]: { status: 200, body: { unreadCount: 1 } },
			"GET /api/v1/companies/c-1/me/leave-requests": {
				status: 200,
				body: envelope({ content: [], page: { totalElements: 0 } }),
			},
			"GET /api/v1/companies/c-1/me/leave-requests/leave-1": {
				status: 200,
				body: leaveFixture({
					leaveRequestId: "leave-1",
					membershipId: "m-c-1",
					status: "APPROVED",
				}),
			},
		});
		await open();
		await userEvent
			.setup()
			.click(await screen.findByText("Your leave request was approved."));
		expect(await screen.findByRole("dialog")).toBeInTheDocument();
		await waitFor(() => {
			expect(
				calls.some((call) => call.path.endsWith("/me/leave-requests/leave-1"))
			).toBe(true);
		});
	});

	it("given_workspaceOutage_when_opening_then_personalNotificationsStillLoad", async () => {
		stubApi({
			"POST /api/v1/public/sessions/refreshes": accessPassReply(),
			"GET /api/v1/me": currentUserReply(),
			"GET /api/v1/me/workspace": { status: 503, body: { status: 503 } },
			[`GET ${BASE}`]: {
				status: 200,
				body: { content: [own], page: { totalElements: 1 } },
			},
			[`GET ${BASE}/unread-count`]: { status: 200, body: { unreadCount: 1 } },
		});
		await open();
		expect(
			await screen.findByText("Your leave request was approved.")
		).toBeInTheDocument();
	});
});
