import type { TFunction } from "i18next";
import type { ConstraintType } from "@/features/scheduling/constraints/api";

/** The longest name the API keeps. */
const NAME_MAX_LENGTH = 100;

/**
 * A name for a new constraint from what it controls and its first shift, such
 * as "Front desk AM staffing"; a shift type with no shift yet goes by its type.
 */
export const nameSuggestion = (
	type: ConstraintType,
	firstShiftName: string | undefined,
	t: TFunction
): string => {
	const usesShift =
		type === "SHIFT_STAFFING" ||
		type === "SHIFT_STAFFING_WITH_STAND_INS" ||
		type === "ROLE_PRESENCE";
	const name =
		usesShift && firstShiftName === undefined
			? t(`scheduling.constraints.types.${type}`)
			: t(`scheduling.constraints.nameSuggestions.${type}`, {
					shift: firstShiftName,
				});
	return name.slice(0, NAME_MAX_LENGTH);
};
