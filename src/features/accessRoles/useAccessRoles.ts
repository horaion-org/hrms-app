import {
	fetchAccessRoles,
	type AccessRole,
	type ListQuery,
} from "@/features/organisation/api";
import {
	useOrganisationList,
	type OrganisationList,
} from "@/features/organisation/useOrganisationList";

/**
 * Role definitions are shared company reference data: their names and
 * permission templates are read with `access_role:read` held anywhere.
 * Who holds them, and where, is scoped separately by the API.
 */
export const useAccessRoles = (
	companyId: string,
	query: ListQuery
): OrganisationList<AccessRole> =>
	useOrganisationList(
		companyId,
		"access_role:read",
		["access-roles", query],
		(signal) => fetchAccessRoles(companyId, query, signal)
	);
