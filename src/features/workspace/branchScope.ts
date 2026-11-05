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

/**
 * The one Branch a page is about, such as a schedule's: the header names it
 * as text, and it cannot be changed there. A route pins it by returning
 * `{ fixedBranch }` from its loader.
 */
export type FixedBranch = { branchId: string; name: string };

/** What a route's loader returns to pin the header's Branch. */
export type FixedBranchLoaderData = { fixedBranch?: FixedBranch };

/** The Branch a route's loader pinned, read from its loader data of any shape; none when it pinned none. */
export const fixedBranchOf = (loaderData: unknown): FixedBranch | undefined => {
	if (
		typeof loaderData !== "object" ||
		loaderData === null ||
		!("fixedBranch" in loaderData)
	)
		return undefined;
	const { fixedBranch } = loaderData;
	return typeof fixedBranch === "object" &&
		fixedBranch !== null &&
		"branchId" in fixedBranch &&
		"name" in fixedBranch &&
		typeof fixedBranch.branchId === "string" &&
		typeof fixedBranch.name === "string"
		? { branchId: fixedBranch.branchId, name: fixedBranch.name }
		: undefined;
};

declare module "@tanstack/react-router" {
	interface StaticDataRouteOption {
		branchScope?: BranchScope;
	}
}
