import type { TFunction } from "i18next";
import type {
	TermsReference,
	WeekFields,
} from "@/features/employmentTerms/api";
import {
	durationLong,
	durationShort,
	formatDays,
} from "@/features/employmentTerms/hours";
import { formatTimes } from "@/features/employmentTerms/rates";

const key = "employmentTerms.summary";

/** Whether a week is part-time: below the company's line, when it has one. */
export const isPartTimeWeek = (
	weekMinutes: number,
	partTimeBelowMinutes: number | null
): boolean =>
	partTimeBelowMinutes !== null && weekMinutes < partTimeBelowMinutes;

/** Whether the reader's figures make these terms part-time; unknown figures never do. */
const partTimeOf = (
	fields: WeekFields,
	reference: TermsReference | undefined
): boolean =>
	reference !== undefined &&
	isPartTimeWeek(fields.weekMinutes, reference.partTimeBelowMinutes);

/** "Works 44 hours over 5½ days a week." and its shift, day and varying forms. */
const workSentence = (fields: WeekFields, t: TFunction): string => {
	const week = durationLong(fields.weekMinutes, t);
	if (fields.daysPerWeek === null) return t(`${key}.weekOnly`, { week });
	const days = formatDays(fields.daysPerWeek);
	const count = fields.daysPerWeek;
	if (fields.dayMinutes === null)
		return t(`${key}.overDays`, { week, days, count });
	const day = durationLong(fields.dayMinutes, t);
	return fields.shiftWork
		? t(`${key}.inShifts`, { week, days, count, day })
		: t(`${key}.overDaysWithDay`, { week, days, count, day });
};

/** The rest day: a weekday, the roster's choice, or none for a part-timer. */
const restSentence = (
	fields: WeekFields,
	partTime: boolean,
	t: TFunction
): string => {
	if (partTime) return t(`${key}.restPartTime`);
	if (fields.restDay === "ROSTERED") return t(`${key}.restRostered`);
	if (fields.restDay === "UNKNOWN") return t(`${key}.restUnknown`);
	return t(`${key}.restFixed`, { weekday: t(`weekdays.${fields.restDay}`) });
};

/**
 * When overtime starts, read against the API's figures. Shift work counts
 * by the week: the product does not average hours over several weeks.
 */
export const overtimeSentence = (
	fields: WeekFields,
	reference: TermsReference,
	t: TFunction
): string => {
	if (isPartTimeWeek(fields.weekMinutes, reference.partTimeBelowMinutes)) {
		const line = durationLong(reference.partTimeBelowMinutes ?? 0, t);
		return reference.fullTimeWeekMinutes === null
			? t(`${key}.partTime`, { line })
			: t(`${key}.partTimeUntil`, {
					line,
					full: durationLong(reference.fullTimeWeekMinutes, t),
				});
	}
	const week = durationLong(fields.weekMinutes, t);
	if (fields.shiftWork) return t(`${key}.overtimeShiftWork`, { week });
	if (fields.dailyOvertime && fields.dayMinutes !== null)
		return t(`${key}.overtimeDayOrWeek`, {
			day: durationLong(fields.dayMinutes, t),
			week,
		});
	return t(`${key}.overtimeWeek`, { week });
};

/**
 * What extra hours earn: "Overtime is paid at 1.5 times." with the rest day's
 * and a day off's own rates (never for a part-timer, whom rosters give
 * neither), or "Hours past 44 hours a week earn nothing extra.". Nothing
 * when the API sent no rate (an older API), rather than a guess.
 */
export const paySentence = (
	fields: WeekFields,
	partTime: boolean,
	t: TFunction
): string | undefined => {
	if (fields.extraHoursPaidAs === "NOTHING")
		return t(`${key}.nothingExtra`, {
			week: durationLong(fields.weekMinutes, t),
		});
	if (fields.overtimePercent === null) return undefined;
	const sentences = [
		t(`${key}.paidAt`, { times: formatTimes(fields.overtimePercent, t) }),
	];
	if (!partTime && fields.restDayWorkPercent !== null)
		sentences.push(
			t(`${key}.restDayAt`, {
				times: formatTimes(fields.restDayWorkPercent, t),
			})
		);
	if (!partTime && fields.dayOffWorkPercent !== null)
		sentences.push(
			t(`${key}.dayOffAt`, { times: formatTimes(fields.dayOffWorkPercent, t) })
		);
	return sentences.join(" ");
};

/** Whether the Employment Act's hour limits hold, and what that means for a roster. */
export const limitsSentence = (fields: WeekFields, t: TFunction): string =>
	t(fields.hoursLimitsApply ? `${key}.limitsApply` : `${key}.limitsDontApply`);

/**
 * What terms mean, in plain words, built from their fields alone: the
 * working week, the rest day, when overtime starts, and whether the Act's
 * hour limits apply. The one sentence the dialog, the catalogue and every
 * profile read, so they never disagree. Overtime is read against the
 * API's `reference` (the part-time line and a full-timer's week); without
 * it the sentence leaves overtime out rather than state a wrong threshold.
 */
export const termsSentence = (
	fields: WeekFields,
	reference: TermsReference | undefined,
	t: TFunction
): string => {
	const partTime = partTimeOf(fields, reference);
	const pay = paySentence(fields, partTime, t);
	return [
		workSentence(fields, t),
		restSentence(fields, partTime, t),
		...(reference === undefined
			? []
			: [overtimeSentence(fields, reference, t)]),
		...(pay === undefined ? [] : [pay]),
		limitsSentence(fields, t),
	].join(" ");
};

/** The rest day, short: "Rest day Sunday" or "Rest day on the roster". */
export const restShort = (fields: WeekFields, t: TFunction): string => {
	if (fields.restDay === "ROSTERED") return t(`${key}.short.restRostered`);
	if (fields.restDay === "UNKNOWN") return t(`${key}.restUnknown`);
	return t(`${key}.short.restFixed`, {
		weekday: t(`weekdays.${fields.restDay}`),
	});
};

/**
 * The list's week, line by line: hours over days ("44 h over 5½ days" or
 * "20 h a week"), then the shift length or "Days vary", then the rest day
 * (none for a part-timer, whom rosters give no rest day).
 */
export const weekLines = (
	fields: WeekFields,
	reference: TermsReference | undefined,
	t: TFunction
): Array<string> => {
	const week = durationShort(fields.weekMinutes, t);
	const lines =
		fields.daysPerWeek === null
			? [t(`${key}.list.weekOnly`, { week }), t(`${key}.list.daysVary`)]
			: [
					t(`${key}.list.overDays`, {
						week,
						days: formatDays(fields.daysPerWeek),
						count: fields.daysPerWeek,
					}),
				];
	if (fields.shiftWork && fields.dayMinutes !== null)
		lines.push(
			t(`${key}.list.shifts`, { day: durationShort(fields.dayMinutes, t) })
		);
	if (!partTimeOf(fields, reference)) lines.push(restShort(fields, t));
	return lines;
};

/** When overtime starts, in a few words, before its rate is added. */
const overtimeStartShort = (
	fields: WeekFields,
	reference: TermsReference,
	t: TFunction
): string => {
	const week = durationShort(fields.weekMinutes, t);
	if (partTimeOf(fields, reference))
		return reference.fullTimeWeekMinutes === null
			? t(`${key}.list.overtimePartTime`)
			: t(`${key}.list.overtimePartTimeUntil`, {
					full: durationShort(reference.fullTimeWeekMinutes, t),
				});
	if (fields.shiftWork) return t(`${key}.list.overtimeShiftWork`, { week });
	if (fields.dailyOvertime && fields.dayMinutes !== null)
		return t(`${key}.list.overtimeDayOrWeek`, {
			day: durationShort(fields.dayMinutes, t),
			week,
		});
	return t(`${key}.list.overtimeWeek`, { week });
};

/**
 * When overtime starts and what it earns, in a few words for the list:
 * "Overtime after 8 h 48 min a day or 44 h a week, at 1.5 times", "Extra
 * hours up to 44 h, then overtime, at 1.5 times", "…, nothing extra". Empty
 * without the API's figures, rather than a guess.
 */
export const overtimeShort = (
	fields: WeekFields,
	reference: TermsReference | undefined,
	t: TFunction
): string => {
	if (reference === undefined) return "";
	const overtime = overtimeStartShort(fields, reference, t);
	if (fields.extraHoursPaidAs === "NOTHING")
		return t(`${key}.list.nothingExtra`, { overtime });
	if (fields.overtimePercent === null) return overtime;
	return t(`${key}.list.atRate`, {
		overtime,
		times: formatTimes(fields.overtimePercent, t),
	});
};

/**
 * A name new terms are offered while nobody has typed one: "5-day week,
 * 44 h", "Shift work, 6 days, 12 h", "Part-time, 20 h", "44 h week".
 */
export const suggestedTermsName = (
	fields: WeekFields,
	partTimeBelowMinutes: number | null,
	t: TFunction
): string => {
	const week = durationShort(fields.weekMinutes, t);
	if (isPartTimeWeek(fields.weekMinutes, partTimeBelowMinutes))
		return t(`${key}.name.partTime`, { week });
	if (fields.daysPerWeek === null) return t(`${key}.name.weekOnly`, { week });
	const days = formatDays(fields.daysPerWeek);
	if (fields.shiftWork && fields.dayMinutes !== null)
		return t(`${key}.name.shiftWork`, {
			days,
			day: durationShort(fields.dayMinutes, t),
		});
	return t(`${key}.name.days`, { days, week });
};
