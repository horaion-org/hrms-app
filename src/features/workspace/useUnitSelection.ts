import { useQuery } from "@tanstack/react-query";
import { workspaceQuery } from "@/features/workspace/api";
import type { PermissionKey } from "@/features/workspace/permissionKeys";
import { retry } from "@/features/workspace/retry";
import {
	resolveWorkspaceUnits,
	type ResolvedUnitSelection,
	type UnitSelection,
	type UnitSelectionRules,
} from "@/features/workspace/unitSelection";

/**
 * The units a list page shows, resolved against the Branches and
 * Departments the workspace offers for `keys`, so the page asks the API for
 * the same units the header and its filters show.
 */
export const useUnitSelection = (
	companyId: string,
	keys: ReadonlyArray<PermissionKey>,
	requested: UnitSelection,
	rules: UnitSelectionRules
): ResolvedUnitSelection => {
	const { data } = useQuery({ ...workspaceQuery, retry });
	return resolveWorkspaceUnits(data, companyId, keys, requested, rules);
};
