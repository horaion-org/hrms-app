import { dataItemsFor, offersData } from "@/features/settings/dataAccess";
import type {
	OptionalSections,
	SettingsSearch,
	SettingsSection,
} from "@/features/settings/sections";
import type { PermissionKey } from "@/features/workspace/permissionKeys";
import { COMPANY_SCOPE } from "@/features/workspace/scopes";
import type { Access } from "@/features/workspace/useAccess";

/** The sections offered with a company-wide read key. */
const READ_KEYS = {
	employment: "employment_terms:read",
	scheduling: "scheduling_policy:read",
	"roster-approvals": "approval_flow:read",
	"leave-types": "leave_type:read",
	"leave-approvals": "approval_flow:read",
} as const satisfies Partial<Record<SettingsSection, PermissionKey>>;

/** The access checks the offer rules need. */
type AccessChecks = Pick<Access, "can" | "canAnywhere">;

/**
 * Which optional Settings sections to offer. Employment terms, Work policy,
 * both approvals and Leave types are offered with their read key
 * company-wide, and also when the link names them (`?section=leave-types`),
 * so the section opens to say the person may not see it. Leave durations is
 * offered with its read key anywhere, since department admins manage their
 * own durations, or when the link names it. Access roles are offered when
 * the key is held anywhere (the list shows the roles where it is), Import
 * and export when it has an item.
 */
export const offeredSections = (
	access: AccessChecks,
	search: Pick<SettingsSearch, "section">
): OptionalSections => {
	const offered = (section: keyof typeof READ_KEYS): boolean =>
		access.can(READ_KEYS[section], COMPANY_SCOPE) || search.section === section;
	return {
		employment: offered("employment"),
		scheduling: offered("scheduling"),
		"roster-approvals": offered("roster-approvals"),
		"leave-types": offered("leave-types"),
		"leave-durations":
			access.canAnywhere("leave_duration:read") ||
			search.section === "leave-durations",
		"leave-approvals": offered("leave-approvals"),
		access: access.canAnywhere("access_role:read"),
		data: offersData(dataItemsFor(access)),
	};
};

/**
 * The section the address asks for, once access is known: a department
 * admin who manages only leave durations and is sent to Leave types (the old
 * `?section=leave` opens it) lands on Leave durations, the leave part they
 * may see.
 */
export const sectionForAccess = (
	access: AccessChecks,
	section: SettingsSection | undefined
): SettingsSection | undefined =>
	section === "leave-types" &&
	!access.can("leave_type:read", COMPANY_SCOPE) &&
	access.canAnywhere("leave_duration:read")
		? "leave-durations"
		: section;
