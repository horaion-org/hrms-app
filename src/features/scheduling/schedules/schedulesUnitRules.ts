import type { UnitSelectionRules } from "@/features/workspace/unitSelection";

/** The Scheduling list follows the header's Branch, and a Department within it from its Filters. */
export const SCHEDULING_UNIT_RULES: UnitSelectionRules = {
	withDepartment: true,
};
