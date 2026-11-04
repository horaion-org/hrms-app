import { describe, expect, it } from "vitest";
import { canSeeReviewNotifications } from "@/features/notifications/reviewAccess";
import type { PermissionKey } from "@/features/workspace/permissionContract.generated";

const holding =
	(...keys: Array<PermissionKey>) =>
	(permission: PermissionKey): boolean =>
		keys.includes(permission);

describe("canSeeReviewNotifications", () => {
	it("shows Needs review to leave reviewers and to schedule publishers", () => {
		expect(canSeeReviewNotifications(holding("leave_request:review"))).toBe(
			true
		);
		expect(canSeeReviewNotifications(holding("schedule:publish"))).toBe(true);
	});

	it("hides it from everyone else", () => {
		expect(canSeeReviewNotifications(holding("schedule:read"))).toBe(false);
		expect(canSeeReviewNotifications(holding())).toBe(false);
	});
});
