import { describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import es from "@/assets/locales/es/translations.json";
import {
	describeNotificationType,
	isKnownNotificationType,
	notificationTarget,
	presentNotification,
	UNKNOWN_NOTIFICATION_TYPE,
} from "@/features/notifications/notificationTypes";

const KNOWN = [
	"LEAVE_REQUEST_SUBMITTED",
	"LEAVE_REQUEST_APPROVED",
	"LEAVE_REQUEST_REJECTED",
	"LEAVE_REQUEST_RECORDED",
	"LEAVE_REQUEST_CHANGED",
	"LEAVE_REQUEST_CANCELLED",
	"SCHEDULE_READY",
	"SHIFT_ASSIGNMENT",
	"SCHEDULE_ASSIGNMENT_UPDATED",
	"SCHEDULE_REJECTED",
	"MEMBER_IMPORT_FINISHED",
];

describe("describeNotificationType", () => {
	it.each(KNOWN)("describes %s with its own copy in every locale", (type) => {
		expect(isKnownNotificationType(type)).toBe(true);
		const descriptor = describeNotificationType(type);
		expect(descriptor.title).toBe(`notifications.types.${type}`);
		expect(en.notifications.types).toHaveProperty(type);
		expect(es.notifications.types).toHaveProperty(type);
	});

	it("gives leave outcomes the leave status colours", () => {
		expect(describeNotificationType("LEAVE_REQUEST_SUBMITTED").tone).toBe(
			"warning"
		);
		expect(describeNotificationType("LEAVE_REQUEST_APPROVED").tone).toBe(
			"success"
		);
		expect(describeNotificationType("LEAVE_REQUEST_REJECTED").tone).toBe(
			"error"
		);
	});

	it.each(["SOMETHING_NEW", "", "toString", "constructor"])(
		"falls back plainly for the unknown code %j",
		(type) => {
			expect(isKnownNotificationType(type)).toBe(false);
			expect(describeNotificationType(type)).toBe(UNKNOWN_NOTIFICATION_TYPE);
		}
	);
});

describe("presentNotification", () => {
	const counts = (
		failed: number,
		status: string
	): { added: number; skipped: number; failed: number; status: string } => ({
		added: 45,
		skipped: 2,
		failed,
		status,
	});

	it("follows the type alone for everything but a finished import", () => {
		expect(
			presentNotification({ type: "SCHEDULE_REJECTED", importCounts: null })
		).toMatchObject({
			tone: "error",
			category: "schedule",
			title: "notifications.types.SCHEDULE_REJECTED",
			values: undefined,
		});
	});

	it("words a clean import as finished, in green, with its counts", () => {
		expect(
			presentNotification({
				type: "MEMBER_IMPORT_FINISHED",
				importCounts: counts(0, "COMPLETED"),
			})
		).toMatchObject({
			tone: "success",
			category: "people",
			title: "notifications.importResult.finished",
			values: { added: 45, skipped: 2, failed: 0 },
		});
	});

	it("turns red when rows failed, and says it stopped when the import failed", () => {
		expect(
			presentNotification({
				type: "MEMBER_IMPORT_FINISHED",
				importCounts: counts(3, "COMPLETED"),
			})
		).toMatchObject({
			tone: "error",
			title: "notifications.importResult.finished",
		});
		expect(
			presentNotification({
				type: "MEMBER_IMPORT_FINISHED",
				importCounts: counts(0, "FAILED"),
			})
		).toMatchObject({
			tone: "error",
			title: "notifications.importResult.stopped",
		});
	});

	it("keeps the plain import copy when the counts are missing", () => {
		expect(
			presentNotification({
				type: "MEMBER_IMPORT_FINISHED",
				importCounts: null,
			})
		).toMatchObject({
			tone: "success",
			title: "notifications.types.MEMBER_IMPORT_FINISHED",
		});
	});
});

describe("notificationTarget", () => {
	const approved = {
		type: "LEAVE_REQUEST_APPROVED",
		leaveRequestId: "leave-1",
		membershipId: "member-1",
		scheduleId: null,
		memberImportJobId: null,
	};
	const scheduleReady = {
		...approved,
		type: "SCHEDULE_READY",
		leaveRequestId: null,
		membershipId: null,
		scheduleId: "schedule-1",
	};
	const importFinished = {
		...approved,
		type: "MEMBER_IMPORT_FINISHED",
		leaveRequestId: null,
		membershipId: null,
		memberImportJobId: "import-1",
	};

	it("opens a leave request, adding the beneficiary only for reviewers", () => {
		expect(notificationTarget(approved, "PERSONAL")).toEqual({
			kind: "leave",
			requestId: "leave-1",
			memberId: undefined,
		});
		expect(notificationTarget(approved, "REVIEW")).toEqual({
			kind: "leave",
			requestId: "leave-1",
			memberId: "member-1",
		});
	});

	it("opens a schedule's roster and an import's result", () => {
		expect(notificationTarget(scheduleReady, "REVIEW")).toEqual({
			kind: "schedule",
			scheduleId: "schedule-1",
		});
		expect(
			notificationTarget(
				{ ...scheduleReady, type: "SCHEDULE_REJECTED" },
				"PERSONAL"
			)
		).toEqual({ kind: "schedule", scheduleId: "schedule-1" });
		expect(notificationTarget(importFinished, "PERSONAL")).toEqual({
			kind: "import",
			importId: "import-1",
		});
	});

	it("opens a rostered member's own view of the roster, and the scheduling page for the rest", () => {
		expect(
			notificationTarget(
				{ ...scheduleReady, type: "SHIFT_ASSIGNMENT" },
				"PERSONAL"
			)
		).toEqual({ kind: "myRoster", scheduleId: "schedule-1" });
		expect(
			notificationTarget(
				{ ...scheduleReady, type: "SCHEDULE_ASSIGNMENT_UPDATED" },
				"PERSONAL"
			)
		).toEqual({ kind: "myRoster", scheduleId: "schedule-1" });
		expect(notificationTarget(scheduleReady, "REVIEW")).toEqual({
			kind: "schedule",
			scheduleId: "schedule-1",
		});
	});

	it("has no target for an unknown type or a missing id", () => {
		expect(
			notificationTarget({ ...approved, type: "SOMETHING_NEW" }, "PERSONAL")
		).toBeUndefined();
		expect(
			notificationTarget({ ...approved, leaveRequestId: null }, "PERSONAL")
		).toBeUndefined();
		expect(
			notificationTarget({ ...scheduleReady, scheduleId: null }, "REVIEW")
		).toBeUndefined();
		expect(
			notificationTarget(
				{ ...importFinished, memberImportJobId: null },
				"PERSONAL"
			)
		).toBeUndefined();
	});
});
