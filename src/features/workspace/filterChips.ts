import type { TFunction } from "i18next";
import type { FilterChip } from "@/components/ui/FilterChips";
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

/** The Department chip while one is chosen; none for every Department. */
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
					selection.department.name,
					onRemove,
					t
				),
			]
		: [];
