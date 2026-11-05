import type { DepartmentChoice } from "@/features/workspace/unitChoices";

/**
 * Whether the chosen Department is no longer offered, as when the header's
 * Branch changes away from it; unknown (false) until the choices load.
 */
export const chosenOutsideOffered = (
	offered: ReadonlyArray<DepartmentChoice> | undefined,
	departmentId: string
): boolean =>
	offered !== undefined &&
	departmentId !== "" &&
	!offered.some((choice) => choice.departmentId === departmentId);
