import { dataItemsFor, offersData } from "@/features/settings/dataAccess";
import type {
	OptionalSections,
	SettingsSearch,
} from "@/features/settings/sections";
import type { PermissionKey } from "@/features/workspace/permissionKeys";
import { COMPANY_SCOPE } from "@/features/workspace/scopes";
import type { Access } from "@/features/workspace/useAccess";

/** The sections offered with a company-wide read key. */
const READ_KEYS = {
	employment: "employment_terms:read",
	scheduling: "scheduling_policy:read",
	leave: "leave_type:read",
	approvals: "approval_flow:read",
} as const satisfies Record<string, PermissionKey>;

/**
 * Which optional Settings sections to offer. Employment, Scheduling, Leave
 * and Approvals are offered with their read key company-wide, and also when
 * the link names them (`?section=leave`), so the section opens to say the
 * person may not see it. Access roles are offered when the key is held
 * anywhere (the list shows the roles where it is), Data when it has an item.
 */
export const offeredSections = (
	access: Pick<Access, "can" | "canAnywhere">,
	search: Pick<SettingsSearch, "section">
): OptionalSections => {
	const offered = (section: keyof typeof READ_KEYS): boolean =>
		access.can(READ_KEYS[section], COMPANY_SCOPE) || search.section === section;
	return {
		employment: offered("employment"),
		scheduling: offered("scheduling"),
		leave: offered("leave"),
		approvals: offered("approvals"),
		access: access.canAnywhere("access_role:read"),
		data: offersData(dataItemsFor(access)),
	};
};
