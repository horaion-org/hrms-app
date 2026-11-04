import type { TFunction } from "i18next";
import type { FilterChip } from "@/components/ui/FilterChips";
import { placeOf } from "@/features/organisation/assignmentTargets";
import type { ResolvedUnitSelection } from "@/features/workspace/unitSelection";

/** A chip reading "Field: value", e.g. "Department: Kitchen". */
export const filterChip = (
	key: string,
	field: string,
	value: string,
	onRemove: () => void,
	t: TFunction
): FilterChip => ({
	key,
	label: t("filterChips.chip", { field, value }),
	onRemove,
});

/** The Department chip while one is chosen, named "Branch › Department"; none for every Department. */
export const departmentChips = (
	selection: ResolvedUnitSelection,
	onRemove: () => void,
	t: TFunction
): Array<FilterChip> =>
	selection.department
		? [
				filterChip(
					"department",
					t("workspace.unitSelector.department"),
					placeOf(
						{
							branchName: selection.department.branchName,
							departmentName: selection.department.name,
						},
						t
					),
					onRemove,
					t
				),
			]
		: [];
