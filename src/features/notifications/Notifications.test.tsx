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
				body: envelope({ content: [], page: { totalElements: 0 } }),
			},
			[`GET ${BASE}/unread-count`]: {
				status: 200,
				body: envelope({ unreadCount: 0 }),
			},
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
				body: envelope({ content: [own], page: { totalElements: 1 } }),
			},
			[`GET ${BASE}/unread-count`]: {
				status: 200,
				body: envelope({ unreadCount: 1 }),
			},
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
				body: envelope({ content: [], page: { totalElements: 0 } }),
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
				body: envelope({
					content: [{ ...own, readAt: read ? own.createdAt : null }],
					page: { totalElements: 1 },
				}),
			}),
			[`GET ${BASE}/unread-count`]: () => ({
				status: 200,
				body: envelope({ unreadCount: read ? 0 : 1 }),
			}),
			[`PUT ${BASE}/notification-1/read`]: () => {
				read = true;
				return { status: 200, body: envelope({ updatedCount: 1 }) };
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
				body: envelope({
					content: [search.includes("REVIEW") ? review : own],
					page: { totalElements: 1 },
				}),
			}),
			[`GET ${BASE}/unread-count`]: {
				status: 200,
				body: envelope({ unreadCount: 1 }),
			},
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
				body: envelope({ content: [own], page: { totalElements: 1 } }),
			},
			[`GET ${BASE}/unread-count`]: {
				status: 200,
				body: envelope({ unreadCount: 1 }),
			},
			"GET /api/v1/companies/c-1/me/leave-requests": {
				status: 200,
				body: envelope({ content: [], page: { totalElements: 0 } }),
			},
			"GET /api/v1/companies/c-1/me/leave-requests/leave-1": {
				status: 200,
				body: envelope(
					leaveFixture({
						leaveRequestId: "leave-1",
						membershipId: "m-c-1",
						status: "APPROVED",
					})
				),
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
				body: envelope({ content: [own], page: { totalElements: 1 } }),
			},
			[`GET ${BASE}/unread-count`]: {
				status: 200,
				body: envelope({ unreadCount: 1 }),
			},
		});
		await open();
		expect(
			await screen.findByText("Your leave request was approved.")
		).toBeInTheDocument();
	});

	it("given_newTypeFromNewerApi_when_listing_then_rendersItPlainlyBesideKnownTypes", async () => {
		stubApi({
			"POST /api/v1/public/sessions/refreshes": accessPassReply(),
			"GET /api/v1/me": currentUserReply(),
			"GET /api/v1/me/workspace": {
				status: 200,
				body: envelope(companyWideWorkspace([])),
			},
			[`GET ${BASE}`]: {
				status: 200,
				body: envelope({
					content: [
						{
							...own,
							notificationId: "future-1",
							type: "SOMETHING_NEW",
							leaveRequestId: null,
						},
						own,
					],
					page: { totalElements: 2 },
				}),
			},
			[`GET ${BASE}/unread-count`]: {
				status: 200,
				body: envelope({ unreadCount: 2 }),
			},
		});
		await open();
		expect(
			await screen.findByText("Your leave request was approved.")
		).toBeInTheDocument();
		const unknown = screen.getByText("You have a new notification.");
		expect(unknown.closest("a")).toBeNull();
	});

	it("given_unreadInTab_when_markingAllReadFromBell_then_sendsThatTabsAudienceAndHidesAtZero", async () => {
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
				body: envelope({
					content: [{ ...own, readAt: read ? own.createdAt : null }],
					page: { totalElements: 1 },
				}),
			}),
			[`GET ${BASE}/unread-count`]: () => ({
				status: 200,
				body: envelope({ unreadCount: read ? 0 : 1 }),
			}),
			[`PUT ${BASE}/read-all`]: () => {
				read = true;
				return { status: 200, body: envelope({ updatedCount: 1 }) };
			},
		});
		await open("/leave");
		const user = userEvent.setup();
		await user.click(
			await screen.findByRole("button", { name: "Notifications, 1 unread" })
		);
		const panel = await screen.findByRole("dialog", { name: "Notifications" });
		await user.click(
			await within(panel).findByRole("button", { name: "Mark all as read" })
		);
		await waitFor(() => {
			expect(
				within(panel).queryByRole("button", { name: "Mark all as read" })
			).toBeNull();
		});
		expect(
			calls.some(
				(call) =>
					call.method === "PUT" &&
					call.path === `${BASE}/read-all` &&
					call.search === "audience=PERSONAL"
			)
		).toBe(true);
	});

	it("given_notification_when_deleted_then_sendsDeleteConfirmsAndRemovesIt", async () => {
		let deleted = false;
		const calls = stubApi({
			"POST /api/v1/public/sessions/refreshes": accessPassReply(),
			"GET /api/v1/me": currentUserReply(),
			"GET /api/v1/me/workspace": {
				status: 200,
				body: envelope(companyWideWorkspace([])),
			},
			[`GET ${BASE}`]: () => ({
				status: 200,
				body: envelope({
					content: deleted ? [] : [own],
					page: { totalElements: deleted ? 0 : 1 },
				}),
			}),
			[`GET ${BASE}/unread-count`]: () => ({
				status: 200,
				body: envelope({ unreadCount: deleted ? 0 : 1 }),
			}),
			[`DELETE ${BASE}/notification-1`]: () => {
				deleted = true;
				return { status: 204 };
			},
		});
		await open();
		await screen.findByText("Your leave request was approved.");
		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Delete notification" }));
		expect(
			await screen.findByText("You have no notifications in this view.")
		).toBeInTheDocument();
		// The app-level toast queue (not mounted in this harness) shows this key.
		expect(
			app?.queryClient.getMutationCache().getAll().slice(-1)[0]?.meta
				?.successMessage
		).toBe("notifications.deleted");
		expect(
			await screen.findByRole("button", { name: "Notifications, 0 unread" })
		).toBeInTheDocument();
		expect(
			calls.some(
				(call) =>
					call.method === "DELETE" &&
					call.path === `${BASE}/notification-1` &&
					call.search === "audience=PERSONAL"
			)
		).toBe(true);
	});

	it("given_notificationAlreadyGone_when_deleted_then_noErrorIsShown", async () => {
		stubApi({
			"POST /api/v1/public/sessions/refreshes": accessPassReply(),
			"GET /api/v1/me": currentUserReply(),
			"GET /api/v1/me/workspace": {
				status: 200,
				body: envelope(companyWideWorkspace([])),
			},
			[`GET ${BASE}`]: {
				status: 200,
				body: envelope({ content: [own], page: { totalElements: 1 } }),
			},
			[`GET ${BASE}/unread-count`]: {
				status: 200,
				body: envelope({ unreadCount: 1 }),
			},
			[`DELETE ${BASE}/notification-1`]: {
				status: 404,
				body: { status: 404, errorCode: "NOTIFICATION_NOT_FOUND" },
			},
		});
		await open();
		await screen.findByText("Your leave request was approved.");
		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: "Delete notification" }));
		await waitFor(() => {
			expect(
				app?.queryClient.getMutationCache().getAll().slice(-1)[0]?.state.status
			).toBe("success");
		});
		expect(
			screen.queryByText("We couldn’t delete the notification. Try again.")
		).toBeNull();
	});

	it("given_twoNotifications_when_firstIsDeleted_then_focusMovesToTheEntryThatTookItsPlace", async () => {
		let deleted = false;
		const second = {
			...own,
			notificationId: "notification-2",
			type: "LEAVE_REQUEST_REJECTED",
		};
		stubApi({
			"POST /api/v1/public/sessions/refreshes": accessPassReply(),
			"GET /api/v1/me": currentUserReply(),
			"GET /api/v1/me/workspace": {
				status: 200,
				body: envelope(companyWideWorkspace([])),
			},
			[`GET ${BASE}`]: () => ({
				status: 200,
				body: envelope({
					content: deleted ? [second] : [own, second],
					page: { totalElements: deleted ? 1 : 2 },
				}),
			}),
			[`GET ${BASE}/unread-count`]: {
				status: 200,
				body: envelope({ unreadCount: 1 }),
			},
			[`DELETE ${BASE}/notification-1`]: () => {
				deleted = true;
				return { status: 204 };
			},
		});
		await open();
		await screen.findByText("Your leave request was approved.");
		await userEvent
			.setup()
			.click(
				screen.getAllByRole("button", { name: "Delete notification" })[0]!
			);
		await waitFor(() => {
			expect(screen.queryByText("Your leave request was approved.")).toBeNull();
		});
		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: "Delete notification" })
			).toHaveFocus();
		});
	});

	it("given_finishedImportWithFailures_when_listed_then_wordsItsCountsAndOpensItsResult", async () => {
		stubApi({
			"POST /api/v1/public/sessions/refreshes": accessPassReply(),
			"GET /api/v1/me": currentUserReply(),
			"GET /api/v1/me/workspace": {
				status: 200,
				body: envelope(companyWideWorkspace([])),
			},
			[`GET ${BASE}`]: {
				status: 200,
				body: envelope({
					content: [
						{
							...own,
							notificationId: "import-notification",
							type: "MEMBER_IMPORT_FINISHED",
							leaveRequestId: null,
							membershipId: null,
							memberImportJobId: "import-1",
							importCounts: {
								added: 45,
								skipped: 2,
								failed: 3,
								status: "COMPLETED",
							},
						},
					],
					page: { totalElements: 1 },
				}),
			},
			[`GET ${BASE}/unread-count`]: {
				status: 200,
				body: envelope({ unreadCount: 1 }),
			},
		});
		await open();
		const link = await screen.findByRole("link", {
			name: "Import finished: 45 added, 2 skipped, 3 failed.",
		});
		expect(link).toHaveAttribute(
			"href",
			"/settings/data/import-people?import=import-1"
		);
		expect(screen.getByText("People")).toBeInTheDocument();
	});

	it("given_shiftAssignmentForAMemberWithoutScheduleRead_when_listed_then_opensTheirOwnRoster", async () => {
		stubApi({
			"POST /api/v1/public/sessions/refreshes": accessPassReply(),
			"GET /api/v1/me": currentUserReply(),
			"GET /api/v1/me/workspace": {
				status: 200,
				body: envelope(companyWideWorkspace([])),
			},
			[`GET ${BASE}`]: {
				status: 200,
				body: envelope({
					content: [
						{
							...own,
							notificationId: "assignment-1",
							type: "SHIFT_ASSIGNMENT",
							leaveRequestId: null,
							membershipId: null,
							scheduleId: "schedule-1",
						},
					],
					page: { totalElements: 1 },
				}),
			},
			[`GET ${BASE}/unread-count`]: {
				status: 200,
				body: envelope({ unreadCount: 1 }),
			},
		});
		await open();
		const link = await screen.findByRole("link", {
			name: "You have new shifts on a published schedule.",
		});
		expect(link).toHaveAttribute("href", "/me/schedules/schedule-1");
	});

	it("given_aChangeToTheirDaysOnAPublishedRoster_when_listed_then_showsTheRemarkAndOpensTheirOwnRoster", async () => {
		stubApi({
			"POST /api/v1/public/sessions/refreshes": accessPassReply(),
			"GET /api/v1/me": currentUserReply(),
			"GET /api/v1/me/workspace": {
				status: 200,
				body: envelope(companyWideWorkspace([])),
			},
			[`GET ${BASE}`]: {
				status: 200,
				body: envelope({
					content: [
						{
							...own,
							notificationId: "updated-1",
							type: "SCHEDULE_ASSIGNMENT_UPDATED",
							leaveRequestId: null,
							membershipId: null,
							scheduleId: "schedule-1",
							remark: "Covering the airport desk on Monday.",
						},
						{
							...own,
							notificationId: "updated-2",
							type: "SCHEDULE_ASSIGNMENT_UPDATED",
							leaveRequestId: null,
							membershipId: null,
							scheduleId: "schedule-1",
						},
					],
					page: { totalElements: 2 },
				}),
			},
			[`GET ${BASE}/unread-count`]: {
				status: 200,
				body: envelope({ unreadCount: 2 }),
			},
		});
		await open();
		const links = await screen.findAllByRole("link", {
			name: "Your shifts on a published schedule changed.",
		});
		expect(links).toHaveLength(2);
		expect(links[0]).toHaveAttribute("href", "/me/schedules/schedule-1");
		expect(
			screen.getAllByText("Covering the airport desk on Monday.")
		).toHaveLength(1);
	});

	it("given_aWithdrawnPublication_when_listed_then_showsTheRemarkAndOpensTheirOwnRoster", async () => {
		stubApi({
			"POST /api/v1/public/sessions/refreshes": accessPassReply(),
			"GET /api/v1/me": currentUserReply(),
			"GET /api/v1/me/workspace": {
				status: 200,
				body: envelope(companyWideWorkspace([])),
			},
			[`GET ${BASE}`]: {
				status: 200,
				body: envelope({
					content: [
						{
							...own,
							notificationId: "withdrawn-1",
							type: "SCHEDULE_PUBLICATION_WITHDRAWN",
							leaveRequestId: null,
							membershipId: null,
							scheduleId: "schedule-1",
							remark: "Wrong week went out. The corrected roster follows.",
						},
					],
					page: { totalElements: 1 },
				}),
			},
			[`GET ${BASE}/unread-count`]: {
				status: 200,
				body: envelope({ unreadCount: 1 }),
			},
		});
		await open();
		const link = await screen.findByRole("link", {
			name: "A published schedule you’re on was withdrawn.",
		});
		expect(link).toHaveAttribute("href", "/me/schedules/schedule-1");
		expect(
			screen.getByText("Wrong week went out. The corrected roster follows.")
		).toBeInTheDocument();
	});

	it("given_aReviewersRemarkOnTheirLeave_when_listed_then_showsItUnderTheTitle", async () => {
		stubApi({
			"POST /api/v1/public/sessions/refreshes": accessPassReply(),
			"GET /api/v1/me": currentUserReply(),
			"GET /api/v1/me/workspace": {
				status: 200,
				body: envelope(companyWideWorkspace([])),
			},
			[`GET ${BASE}`]: {
				status: 200,
				body: envelope({
					content: [
						{
							...own,
							notificationId: "changed-1",
							type: "LEAVE_REQUEST_CHANGED",
							remark: "Moved to Friday, as agreed on the phone.",
						},
					],
					page: { totalElements: 1 },
				}),
			},
			[`GET ${BASE}/unread-count`]: {
				status: 200,
				body: envelope({ unreadCount: 1 }),
			},
		});
		await open();
		const link = await screen.findByRole("link", {
			name: "Your leave was changed.",
		});
		expect(link.getAttribute("href")).toContain("/leave");
		expect(
			screen.getByText("Moved to Friday, as agreed on the phone.")
		).toBeInTheDocument();
	});

	it("given_schedulePublisherWithoutLeaveReview_when_opening_then_needsReviewListsTheReadySchedule", async () => {
		stubApi({
			"POST /api/v1/public/sessions/refreshes": accessPassReply(),
			"GET /api/v1/me": currentUserReply(),
			"GET /api/v1/me/workspace": {
				status: 200,
				body: envelope(
					companyWideWorkspace(["schedule:read", "schedule:publish"])
				),
			},
			[`GET ${BASE}`]: ({ search }) => ({
				status: 200,
				body: envelope({
					content: search.includes("REVIEW")
						? [
								{
									...own,
									notificationId: "ready-1",
									type: "SCHEDULE_READY",
									leaveRequestId: null,
									membershipId: null,
									scheduleId: "schedule-1",
								},
							]
						: [],
					page: { totalElements: search.includes("REVIEW") ? 1 : 0 },
				}),
			}),
			[`GET ${BASE}/unread-count`]: {
				status: 200,
				body: envelope({ unreadCount: 1 }),
			},
		});
		await open();
		await userEvent
			.setup()
			.click(await screen.findByRole("tab", { name: "Needs review" }));
		const link = await screen.findByRole("link", {
			name: "A schedule is ready for review.",
		});
		expect(link).toHaveAttribute("href", "/scheduling/schedule-1");
	});
});
