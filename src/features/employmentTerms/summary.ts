import type { TFunction } from "i18next";
import type {
	TermsReference,
	WeekFields,
} from "@/features/employmentTerms/api";
import { formatDays, formatHours } from "@/features/employmentTerms/hours";

const key = "employmentTerms.summary";

/** Whether a week is part-time: below the company's line, when it has one. */
export const isPartTimeWeek = (
	weekMinutes: number,
	partTimeBelowMinutes: number | null
): boolean =>
	partTimeBelowMinutes !== null && weekMinutes < partTimeBelowMinutes;

/** "Works 5 days a week, 8.8 hours a day." and its shift and part-time forms. */
const workSentence = (
	fields: WeekFields,
	t: TFunction,
	language: string
): string => {
	const week = formatHours(fields.weekMinutes, language);
	if (fields.daysPerWeek === null) return t(`${key}.weekOnly`, { week });
	const days = formatDays(fields.daysPerWeek, language);
	const count = fields.daysPerWeek;
	if (fields.dayMinutes === null) return t(`${key}.days`, { days, count });
	const day = formatHours(fields.dayMinutes, language);
	return fields.shiftWork
		? t(`${key}.daysInShifts`, { days, day, count })
		: t(`${key}.daysAndHours`, { days, day, count });
};

const restSentence = (fields: WeekFields, t: TFunction): string => {
	if (fields.restDay === "ROSTERED") return t(`${key}.restRostered`);
	if (fields.restDay === "UNKNOWN") return t(`${key}.restUnknown`);
	return t(`${key}.restFixed`, { weekday: t(`weekdays.${fields.restDay}`) });
};

const overtimeSentence = (
	fields: WeekFields,
	{ partTimeBelowMinutes, fullTimeWeekMinutes }: TermsReference,
	t: TFunction,
	language: string
): string => {
	if (isPartTimeWeek(fields.weekMinutes, partTimeBelowMinutes)) {
		const line = formatHours(partTimeBelowMinutes ?? 0, language);
		return fullTimeWeekMinutes === null
			? t(`${key}.partTime`, { line })
			: t(`${key}.partTimeUntil`, {
					line,
					full: formatHours(fullTimeWeekMinutes, language),
				});
	}
	const week = formatHours(fields.weekMinutes, language);
	if (fields.shiftWork) return t(`${key}.overtimeAveraged`, { week });
	if (fields.dailyOvertime && fields.dayMinutes !== null)
		return t(`${key}.overtimeDayOrWeek`, {
			day: formatHours(fields.dayMinutes, language),
			week,
		});
	return t(`${key}.overtimeWeek`, { week });
};

/** "Rostered for at most 72 hours a week." */
const mostSentence = (
	mostWeekMinutes: number,
	t: TFunction,
	language: string
): string =>
	t(`${key}.mostHours`, { most: formatHours(mostWeekMinutes, language) });

/**
 * What terms mean, in plain words, built from their fields alone: the
 * working week, the rest day, when overtime starts, the most hours a week
 * when set, and whether the Act's hour limits apply. The one sentence the
 * dialog, the catalogue and every profile read, so they never disagree.
 * Overtime is read against the API's `reference` (the part-time line and a
 * full-timer's week); without it the sentence leaves overtime out rather
 * than state a wrong threshold.
 */
export const termsSentence = (
	fields: WeekFields,
	reference: TermsReference | undefined,
	t: TFunction,
	language: string
): string =>
	[
		workSentence(fields, t, language),
		restSentence(fields, t),
		...(reference === undefined
			? []
			: [overtimeSentence(fields, reference, t, language)]),
		...(fields.mostWeekMinutes === null
			? []
			: [mostSentence(fields.mostWeekMinutes, t, language)]),
		t(
			fields.hoursLimitsApply ? `${key}.limitsApply` : `${key}.limitsDontApply`
		),
	].join(" ");

/**
 * The catalogue's short form: "5 days · 8.8 h a day · 44 h", or "20 h a
 * week", ending "· at most 72 h" when the terms set most hours a week.
 */
export const weekShort = (
	fields: WeekFields,
	t: TFunction,
	language: string
): string => {
	const week = formatHours(fields.weekMinutes, language);
	const most =
		fields.mostWeekMinutes === null
			? []
			: [
					t(`${key}.short.most`, {
						most: formatHours(fields.mostWeekMinutes, language),
					}),
				];
	if (fields.daysPerWeek === null)
		return [t(`${key}.short.weekOnly`, { week }), ...most].join(" · ");
	const parts = [
		t(`${key}.short.days`, {
			days: formatDays(fields.daysPerWeek, language),
			count: fields.daysPerWeek,
		}),
	];
	if (fields.dayMinutes !== null)
		parts.push(
			t(fields.shiftWork ? `${key}.short.shifts` : `${key}.short.day`, {
				day: formatHours(fields.dayMinutes, language),
			})
		);
	parts.push(t(`${key}.short.week`, { week }), ...most);
	return parts.join(" · ");
};

/**
 * A name new terms are offered while nobody has typed one: "5-day week,
 * 44 h", "Shift work, 6 days, 12 h", "Part-time, 20 h", "44 h week".
 */
export const suggestedTermsName = (
	fields: WeekFields,
	partTimeBelowMinutes: number | null,
	t: TFunction,
	language: string
): string => {
	const week = formatHours(fields.weekMinutes, language);
	if (isPartTimeWeek(fields.weekMinutes, partTimeBelowMinutes))
		return t(`${key}.name.partTime`, { week });
	if (fields.daysPerWeek === null) return t(`${key}.name.weekOnly`, { week });
	const days = formatDays(fields.daysPerWeek, language);
	if (fields.shiftWork && fields.dayMinutes !== null)
		return t(`${key}.name.shiftWork`, {
			days,
			day: formatHours(fields.dayMinutes, language),
		});
	return t(`${key}.name.days`, { days, week });
};

/** The rest day, short: "Rest day Sunday" or "Rest day on the roster". */
export const restShort = (fields: WeekFields, t: TFunction): string => {
	if (fields.restDay === "ROSTERED") return t(`${key}.short.restRostered`);
	if (fields.restDay === "UNKNOWN") return t(`${key}.restUnknown`);
	return t(`${key}.short.restFixed`, {
		weekday: t(`weekdays.${fields.restDay}`),
	});
};
