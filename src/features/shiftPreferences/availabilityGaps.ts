import { weekdayOf, type Weekday } from "@/common/weekdays";
import type { PreferenceDay } from "@/features/shiftPreferences/api";

/**
 * The open days of a week, as dates, that fall on a weekday with no
 * availability stated: a part-timer is never scheduled on them, whatever
 * they prefer. A day that can no longer be changed is left out.
 */
export const daysWithoutAvailability = (
	days: ReadonlyArray<PreferenceDay>,
	availableWeekdays: ReadonlyArray<Weekday>
): Array<string> =>
	days
		.filter(
			(day) => day.editable && !availableWeekdays.includes(weekdayOf(day.date))
		)
		.map((day) => day.date);
