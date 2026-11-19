import type {
	PreferenceDay,
	PreferredShift,
} from "@/features/shiftPreferences/api";

/*
 * The day's limit on preferred shifts, decided without rendering: which are
 * chosen, whether another may be, and the set after a tap.
 */

/** The shifts chosen for a day, in the day's order. */
export const preferredShifts = (day: PreferenceDay): Array<PreferredShift> =>
	day.shifts.filter((shift) => shift.preferred);

/** The ids of the shifts chosen for a day, in the day's order. */
export const chosenShiftIds = (day: PreferenceDay): Array<string> =>
	day.shifts.filter((shift) => shift.preferred).map((shift) => shift.shiftId);

/** Whether `chosen` shifts already fill the day's limit of `max`. */
export const isAtLimit = (chosen: number, max: number): boolean =>
	chosen >= max;

/**
 * The chosen ids after tapping `shiftId`: taken out when chosen, added when
 * there is room, unchanged when the day is full.
 */
export const toggledShiftIds = (
	chosen: ReadonlyArray<string>,
	shiftId: string,
	max: number
): Array<string> => {
	if (chosen.includes(shiftId)) return chosen.filter((id) => id !== shiftId);
	if (isAtLimit(chosen.length, max)) return [...chosen];
	return [...chosen, shiftId];
};
