import type { DepartmentChoice } from "@/features/workspace/unitChoices";

/**
 * The Department an add dialog opens with: the one the list is filtered
 * to when it may be chosen, else the only one there is to choose, else
 * none (Job titles always opens empty; the filter's is a convenience here).
 */
export const initialDepartmentOf = (
	choices: ReadonlyArray<Pick<DepartmentChoice, "departmentId">>,
	filterDepartmentId?: string
): string => {
	if (choices.some((choice) => choice.departmentId === filterDepartmentId))
		return filterDepartmentId ?? "";
	return choices.length === 1 ? (choices[0]?.departmentId ?? "") : "";
};
