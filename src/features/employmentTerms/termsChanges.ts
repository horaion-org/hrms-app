import type { TFunction } from "i18next";
import dayjs from "dayjs";
import { formatDate, type IsoDate } from "@/components/forms/Calendar";
import type {
	EmploymentTermsBody,
	TermsOverviewItem,
	WeekFields,
} from "@/features/employmentTerms/api";
import { formatHours } from "@/features/employmentTerms/hours";
import { isPartTimeWeek } from "@/features/employmentTerms/summary";

/** The fields that change how hours are counted; name and description never do. */
const WEEK_FIELDS: ReadonlyArray<keyof WeekFields> = [
	"daysPerWeek",
	"weekMinutes",
	"dayMinutes",
	"mostWeekMinutes",
	"restDay",
	"dailyOvertime",
	"shiftWork",
	"hoursLimitsApply",
];

/** Whether the working week changes; only then can it change from a date. */
export const weekChanges = (
	current: Pick<TermsOverviewItem, keyof WeekFields>,
	next: EmploymentTermsBody
): boolean => WEEK_FIELDS.some((field) => current[field] !== next[field]);

/**
 * Whether saving needs the "correct or change from a date" choice: the
 * terms are held, and their week changes. A new name or description saves
 * straight away.
 */
export const needsApplyChoice = (
	current: Pick<
		TermsOverviewItem,
		keyof WeekFields | "holderCount" | "scheduledCount"
	>,
	next: EmploymentTermsBody
): boolean =>
	current.holderCount + current.scheduledCount > 0 &&
	weekChanges(current, next);

/** Whether a date is a Monday, the day every change of terms starts on. */
export const isMonday = (date: IsoDate): boolean => dayjs(date).day() === 1;

/** The Monday after `today` (a week on when today is a Monday). */
export const nextMonday = (today: IsoDate): IsoDate => {
	const day = dayjs(today);
	const ahead = (8 - day.day()) % 7 || 7;
	return day.add(ahead, "day").format("YYYY-MM-DD");
};

/**
 * The name new terms get when held terms change from a date: the old name
 * with the new week, e.g. "Five-day week, 42 h" from "Five-day week, 44 h",
 * or the old name and "from 5 Jan 2027" when the name carries no hours.
 */
export const successorNameOf = (
	currentName: string,
	next: Pick<WeekFields, "weekMinutes">,
	fromDate: IsoDate,
	t: TFunction,
	language: string
): string => {
	const hours = formatHours(next.weekMinutes, language);
	const withHours = currentName.replace(/\d+([.,]\d+)?\s*h\b/, `${hours} h`);
	if (withHours !== currentName) return withHours;
	return t("employmentTerms.apply.successorName", {
		name: currentName,
		date: formatDate(fromDate, language),
	});
};

/**
 * A part-time Employment type on terms that are not part-time, or the
 * reverse: worth a warning, never a refusal. Their own week counts when they
 * have one. Nothing is said when the company has no part-time line.
 */
export const partTimeMismatch = (
	employmentType: string | null,
	termsWeekMinutes: number,
	contractedWeekMinutes: number | null,
	partTimeBelowMinutes: number | null
): "partTimeOnFullTerms" | "fullTimeOnPartTerms" | undefined => {
	if (partTimeBelowMinutes === null) return undefined;
	const partTerms = isPartTimeWeek(
		contractedWeekMinutes ?? termsWeekMinutes,
		partTimeBelowMinutes
	);
	if (employmentType === "PART_TIME" && !partTerms)
		return "partTimeOnFullTerms";
	if (employmentType === "FULL_TIME" && partTerms) return "fullTimeOnPartTerms";
	return undefined;
};
