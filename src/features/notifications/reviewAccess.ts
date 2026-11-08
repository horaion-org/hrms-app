import type { PermissionKey } from "@/features/workspace/permissionContract.generated";

/** The keys that put items in the Needs review view: leave to review, schedules to publish, approval steps to decide. */
export const REVIEW_PERMISSIONS: ReadonlyArray<PermissionKey> = [
	"leave_request:review",
	"schedule:publish",
	"approval:decide",
];

/** Whether the caller holds any key whose items the Needs review view lists, anywhere in the company. */
export const canSeeReviewNotifications = (
	canAnywhere: (permission: PermissionKey) => boolean
): boolean => REVIEW_PERMISSIONS.some((permission) => canAnywhere(permission));
