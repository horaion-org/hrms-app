import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { InboxNotification } from "@/features/notifications/api";
import { NotificationRow } from "@/features/notifications/NotificationRow";

const notification: InboxNotification = {
	notificationId: "notification-1",
	type: "LEAVE_REQUEST_APPROVED",
	leaveRequestId: "leave-1",
	membershipId: "member-1",
	scheduleId: null,
	memberImportJobId: null,
	importCounts: null,
	remark: null,
	rosterDay: null,
	occurredAt: "2026-11-04T11:55:00Z",
	createdAt: "2026-11-04T11:55:05Z",
	readAt: null,
};

const show = (
	overrides: Partial<InboxNotification> = {}
): { onRead: ReturnType<typeof vi.fn>; onDelete: ReturnType<typeof vi.fn> } => {
	const onRead = vi.fn();
	const onDelete = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<NotificationRow
				notification={{ ...notification, ...overrides }}
				now={new Date("2026-11-04T12:00:00Z")}
				onDelete={onDelete}
				onRead={onRead}
			>
				Your leave request was approved.
			</NotificationRow>
		</I18nextProvider>
	);
	return { onRead, onDelete };
};

describe("NotificationRow", () => {
	it("given_aPhone_when_shown_then_putsTheActionsInTheRowsMenu", () => {
		show();

		const menu = screen.getByRole("button", { name: "Notification actions" });
		expect(menu.parentElement).toHaveClass("sm:hidden");
		expect(
			screen.getByRole("button", { name: "Mark as read" }).parentElement
		).toHaveClass("hidden", "sm:flex");
	});

	it("given_theRowsMenu_when_itsActionsAreChosen_then_marksReadAndDeletes", async () => {
		const user = userEvent.setup();
		const { onRead, onDelete } = show();

		await user.click(
			screen.getByRole("button", { name: "Notification actions" })
		);
		await user.click(screen.getByRole("menuitem", { name: "Mark as read" }));
		await user.click(
			screen.getByRole("button", { name: "Notification actions" })
		);
		await user.click(
			screen.getByRole("menuitem", { name: "Delete notification" })
		);

		expect(onRead).toHaveBeenCalledOnce();
		expect(onDelete).toHaveBeenCalledOnce();
	});

	it("given_aReadNotification_when_itsMenuOpens_then_offersOnlyDelete", async () => {
		const user = userEvent.setup();
		show({ readAt: "2026-11-04T11:56:00Z" });

		await user.click(
			screen.getByRole("button", { name: "Notification actions" })
		);

		expect(
			screen.getAllByRole("menuitem").map((item) => item.textContent)
		).toEqual(["Delete notification"]);
	});
});
