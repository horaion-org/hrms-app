import type { TFunction } from "i18next";
import type { ConstraintType } from "@/features/scheduling/constraints/api";
import {
	isCountedOnShifts,
	isRetiredConstraintType,
} from "@/features/scheduling/constraints/constraintTypeCatalogue";
import { NAME_MAX_LENGTH } from "@/features/organisation/nameSchema";

/**
 * A name for a new constraint from what it controls and its first shift, such
 * as "Front desk AM staffing"; a shift type with no shift yet goes by its type.
 */
export const nameSuggestion = (
	type: ConstraintType,
	firstShiftName: string | undefined,
	t: TFunction
): string => {
	// A retired kind is never offered, so it is never named; it keeps its label.
	if (isRetiredConstraintType(type))
		return t(`scheduling.constraints.types.${type}`);
	const name =
		isCountedOnShifts(type) && firstShiftName === undefined
			? t(`scheduling.constraints.types.${type}`)
			: t(`scheduling.constraints.nameSuggestions.${type}`, {
					shift: firstShiftName,
				});
	return name.slice(0, NAME_MAX_LENGTH);
};
