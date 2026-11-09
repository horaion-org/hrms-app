import { describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import es from "@/assets/locales/es/translations.json";
import { notificationLink } from "@/features/notifications/notificationLink";
import {
	describeNotificationType,
	notificationTarget,
} from "@/features/notifications/notificationTypes";
import { canSeeReviewNotifications } from "@/features/notifications/reviewAccess";
import type { PermissionKey } from "@/features/workspace/permissionContract.generated";

const requested = {
	type: "APPROVAL_REQUESTED",
	leaveRequestId: null,
	membershipId: null,
	scheduleId: null,
	memberImportJobId: null,
	rosterDay: null,
	approvalSubjectType: "SCHEDULE_PUBLICATION",
	approvalSubjectId: "s-1",
};

describe("approval notifications", () => {
	it("asks the approver to act and tells the submitter a fact, in both locales", () => {
		expect(describeNotificationType("APPROVAL_REQUESTED")).toMatchObject({
			tone: "warning",
			category: "schedule",
			title: "approvals.notifications.requested",
		});
		expect(describeNotificationType("APPROVAL_DECIDED")).toMatchObject({
			tone: "info",
			category: "schedule",
			title: "approvals.notifications.decided",
		});
		expect(en.approvals.notifications.requested).toBe(
			"A roster needs your approval."
		);
		expect(es.approvals.notifications).toHaveProperty("requested");
		expect(es.approvals.notifications).toHaveProperty("decided");
	});

	it("words a cancelled submission and a stalled step as asks to act, in both locales", () => {
		expect(describeNotificationType("APPROVAL_CANCELLED")).toMatchObject({
			tone: "warning",
			category: "schedule",
			title: "approvals.notifications.cancelled",
		});
		expect(describeNotificationType("APPROVAL_STEP_STALLED")).toMatchObject({
			tone: "warning",
			category: "schedule",
			title: "approvals.notifications.stalled",
		});
		expect(en.approvals.notifications.cancelled).toBe(
			"The approval of a roster you submitted was cancelled before anyone decided it. Submit it again."
		);
		expect(en.approvals.notifications.stalled).toBe(
			"A step of a roster’s approval has nobody left who can decide it. Check who can approve, or withdraw the submission."
		);
		expect(es.approvals.notifications).toHaveProperty("cancelled");
		expect(es.approvals.notifications).toHaveProperty("stalled");
	});

	it.each(["APPROVAL_CANCELLED", "APPROVAL_STEP_STALLED"])(
		"opens the roster with its approval beside it for %s",
		(type) => {
			expect(notificationTarget({ ...requested, type }, "PERSONAL")).toEqual({
				kind: "approval",
				scheduleId: "s-1",
			});
		}
	);

	it("opens the roster with its approval beside it, for the approver and the submitter", () => {
		expect(notificationTarget(requested, "REVIEW")).toEqual({
			kind: "approval",
			scheduleId: "s-1",
		});
		expect(
			notificationTarget({ ...requested, type: "APPROVAL_DECIDED" }, "PERSONAL")
		).toEqual({ kind: "approval", scheduleId: "s-1" });
		expect(notificationLink({ kind: "approval", scheduleId: "s-1" })).toEqual({
			to: "/scheduling/$scheduleId",
			params: { scheduleId: "s-1" },
			search: { panel: "approval" },
		});
	});

	it("opens nothing for a subject this build does not know, or without one", () => {
		expect(
			notificationTarget(
				{ ...requested, approvalSubjectType: "LEAVE_REQUEST" },
				"REVIEW"
			)
		).toBeUndefined();
		expect(
			notificationTarget({ ...requested, approvalSubjectId: null }, "REVIEW")
		).toBeUndefined();
	});

	it("shows Needs review to whoever may decide approval steps", () => {
		const holding =
			(...keys: Array<PermissionKey>) =>
			(permission: PermissionKey): boolean =>
				keys.includes(permission);
		expect(canSeeReviewNotifications(holding("approval:decide"))).toBe(true);
		expect(canSeeReviewNotifications(holding("approval:read"))).toBe(false);
	});
});
