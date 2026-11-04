import type { UnitSelectionRules } from "@/features/workspace/unitSelection";

/** The dashboard's leave figures follow the header's Branch; there is no Department filter here. */
export const DASHBOARD_UNIT_RULES: UnitSelectionRules = {
	withDepartment: false,
};
