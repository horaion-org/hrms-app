import type { RoleWithGrant } from "./seed-data";

/** Key sets per user type, exactly as the brief lists them plus the read prerequisites ADR-0048 makes mandatory. */
export const ROLE_KEYS: Record<RoleWithGrant, string[]> = {
	manager: ["schedule:read", "schedule:create", "schedule:update", "schedule:generate", "schedule:publish", "schedule:delete", "schedule:edit_shift", "leave_request:read", "leave_request:review"],
	manager2: ["schedule:read", "schedule:create", "schedule:update", "schedule:generate", "schedule:publish", "schedule:delete", "schedule:edit_shift", "leave_request:read", "leave_request:review"],
	editor: ["schedule:read", "schedule:edit_shift"],
	hr: ["leave_type:read", "leave_type:update", "employment_terms:read", "employment_terms:update", "member_employment_terms:read", "member_employment_terms:update", "leave_request:read", "leave_request:review"],
	approver: ["approval:read", "approval:decide", "schedule:read", "schedule:publish"],
};
export const ROLE_NAMES: Record<RoleWithGrant, string> = {
	manager: "Operations manager",
	manager2: "Support manager",
	editor: "Roster editor - no leave",
	hr: "HR",
	approver: "Publication approver",
};
