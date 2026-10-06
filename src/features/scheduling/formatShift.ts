import type { TFunction } from "i18next";
import { isWeekdays, type Shift } from "@/features/scheduling/scheduleDraft";

/** "09:00 – 15:00" */
export const formatTimeRange = (
	shift: Pick<Shift, "start" | "end">,
	t: TFunction
): string => t("scheduling.timeRange", { start: shift.start, end: shift.end });

/** "Weekdays" for Monday to Friday, otherwise each day, e.g. "Mon, Wed, Fri". */
export const formatDays = (days: Shift["days"], t: TFunction): string =>
	isWeekdays(days)
		? t("scheduling.days.weekdays")
		: days.map((day) => t(`scheduling.days.${day}`)).join(", ");
