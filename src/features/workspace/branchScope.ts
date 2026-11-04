import type { PermissionKey } from "@/features/workspace/permissionKeys";
import type { UnitSelectionRules } from "@/features/workspace/unitSelection";

/**
 * What a route lists by Branch: the read keys that offer a Branch, and the
 * unit rules for the route's current search (undefined for a view that
 * does not list by Branch, such as My leave). Declared as the route's
 * `staticData.branchScope`; the header shows the Branch only where one is
 * declared.
 */
export type BranchScope = {
	keys: ReadonlyArray<PermissionKey>;
	rulesFor: (search: Record<string, unknown>) => UnitSelectionRules | undefined;
};

declare module "@tanstack/react-router" {
	interface StaticDataRouteOption {
		branchScope?: BranchScope;
	}
}
