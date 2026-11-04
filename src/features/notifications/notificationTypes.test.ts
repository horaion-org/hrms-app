import { describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import es from "@/assets/locales/es/translations.json";
import {
	describeNotificationType,
	isKnownNotificationType,
	leaveRequestTarget,
	UNKNOWN_NOTIFICATION_TYPE,
} from "@/features/notifications/notificationTypes";

const KNOWN = [
	"LEAVE_REQUEST_SUBMITTED",
	"LEAVE_REQUEST_APPROVED",
	"LEAVE_REQUEST_REJECTED",
	"SCHEDULE_READY",
	"SHIFT_ASSIGNMENT",
	"SCHEDULE_ASSIGNMENT_UPDATED",
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

describe("leaveRequestTarget", () => {
	const approved = {
		type: "LEAVE_REQUEST_APPROVED",
		leaveRequestId: "leave-1",
		membershipId: "member-1",
	};

	it("opens the request, adding the beneficiary only for reviewers", () => {
		expect(leaveRequestTarget(approved, "PERSONAL")).toEqual({
			requestId: "leave-1",
			memberId: undefined,
		});
		expect(leaveRequestTarget(approved, "REVIEW")).toEqual({
			requestId: "leave-1",
			memberId: "member-1",
		});
	});

	it("has no leave target for other categories or a missing request", () => {
		expect(
			leaveRequestTarget({ ...approved, type: "SHIFT_ASSIGNMENT" }, "PERSONAL")
		).toBeUndefined();
		expect(
			leaveRequestTarget({ ...approved, type: "SOMETHING_NEW" }, "PERSONAL")
		).toBeUndefined();
		expect(
			leaveRequestTarget({ ...approved, leaveRequestId: null }, "PERSONAL")
		).toBeUndefined();
	});
});
