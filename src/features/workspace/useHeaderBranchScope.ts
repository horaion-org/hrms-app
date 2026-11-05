import { useMatches, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import type { BranchScope } from "@/features/workspace/branchScope";
import { parseUnitSearch } from "@/features/workspace/unitSearch";
import {
	staleBranch,
	type ResolvedUnitSelection,
	type UnitSelectionRules,
} from "@/features/workspace/unitSelection";
import { useUnitSelection } from "@/features/workspace/useUnitSelection";

/** Stands in while no route declares a scope, so the hooks below always run. */
const NO_SCOPE: BranchScope = { keys: [], rulesFor: () => undefined };
/** The header resolves the Branch only; a page's Department is its own Filters field. */
const HEADER_RULES: UnitSelectionRules = { withDepartment: false };

/**
 * The navigation for a new Branch on the current page: it drops the
 * Department and starts the list again from its first page. The page is
 * only known at run time, so its search is typed loosely here.
 */
const branchChange = (branchId: string | undefined, replace: boolean): never =>
	({
		to: ".",
		search: (previous: Record<string, unknown>) => ({
			...previous,
			branch: branchId,
			department: undefined,
			page: undefined,
		}),
		replace,
	}) as never;

export type HeaderBranchScope = {
	selection: ResolvedUnitSelection;
	/** Writes the chosen Branch (`ALL_BRANCHES` for every Branch) and starts the list again. */
	choose: (branchId: string) => void;
};

/**
 * The Branch the current page lists, for the header: found on the deepest
 * route declaring `staticData.branchScope` and resolved with that route's
 * keys, so it is the Branch the page resolves too. The route's rules only
 * say whether the current view lists by Branch: undefined (no header
 * control) where it does not. A Branch in the URL that the page does not
 * offer is taken out once.
 */
export const useHeaderBranchScope = (): HeaderBranchScope | undefined => {
	const companyId = useCurrentCompanyId();
	const navigate = useNavigate();
	const match = useMatches({
		select: (matches) =>
			[...matches].reverse().find((each) => each.staticData.branchScope),
	});
	const scope = match?.staticData.branchScope ?? NO_SCOPE;
	const search = (match?.search ?? {}) as Record<string, unknown>;
	const rules = scope.rulesFor(search);
	const { branch } = parseUnitSearch(search);
	const selection = useUnitSelection(
		companyId,
		scope.keys,
		{ branchId: branch },
		HEADER_RULES
	);
	const stale =
		rules !== undefined && staleBranch(selection, { branchId: branch });
	useEffect(() => {
		if (stale) void navigate(branchChange(undefined, true));
	}, [stale, navigate]);
	if (!rules || selection.branches.length === 0) return undefined;
	return {
		selection,
		choose: (branchId): void => {
			void navigate(branchChange(branchId, false));
		},
	};
};
