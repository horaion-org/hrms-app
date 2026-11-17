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
export const partTimeOf = (
	fields: WeekFields,
	reference: TermsReference | undefined
): boolean =>
	reference !== undefined &&
	isPartTimeWeek(fields.weekMinutes, reference.partTimeBelowMinutes);

/** When overtime starts, read against the API's figures: by the day and the week, or by the week. */
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
	if (fields.dailyOvertime && fields.dayMinutes !== null)
		return t(`${key}.overtimeDayOrWeek`, {
			day: durationLong(fields.dayMinutes, t),
			week,
		});
	return t(`${key}.overtimeWeek`, { week });
};

/** A week of this many working days or more leaves no day off beside the rest day. */
const DAYS_WITHOUT_A_DAY_OFF = 6;

/** Whether the overtime rate applies: always under the Act's hour rules, otherwise only when paid at a rate. */
export const paidAtARate = (fields: WeekFields): boolean =>
	fields.hoursLimitsApply || fields.extraHoursPaidAs === "RATE";

/** Whether the terms have a day off beside the rest day, whose work the terms price. */
export const hasDayOff = (fields: WeekFields, partTime: boolean): boolean =>
	!partTime &&
	fields.daysPerWeek !== null &&
	fields.daysPerWeek < DAYS_WITHOUT_A_DAY_OFF;

const sentenceKey = "employmentTerms.readBack.sentence";

/** "5 days a week, 44 h (8 h 48 min a day)" or "20 h a week, days vary". */
const weekWords = (fields: WeekFields, t: TFunction): string => {
	const week = durationShort(fields.weekMinutes, t);
	if (fields.daysPerWeek === null)
		return t(`${sentenceKey}.weekVaries`, { week });
	const days = formatDays(fields.daysPerWeek);
	const count = fields.daysPerWeek;
	return fields.dayMinutes === null
		? t(`${sentenceKey}.days`, { days, count, week })
		: t(`${sentenceKey}.daysWithDay`, {
				days,
				count,
				week,
				day: durationShort(fields.dayMinutes, t),
			});
};

/** The rest day; none for a part-timer, whom rosters give no rest day. */
const restWords = (
	fields: WeekFields,
	partTime: boolean,
	t: TFunction
): Array<string> => {
	if (partTime) return [];
	if (fields.restDay === "ROSTERED") return [t(`${sentenceKey}.restRostered`)];
	if (fields.restDay === "UNKNOWN") return [t(`${key}.restUnknown`)];
	return [
		t(`${sentenceKey}.restFixed`, {
			weekday: t(`weekdays.${fields.restDay}`),
		}),
	];
};

/** What extra hours earn, read against the API's figures. */
const overtimeWords = (
	fields: WeekFields,
	reference: TermsReference,
	partTime: boolean,
	t: TFunction
): Array<string> => {
	const week = durationShort(fields.weekMinutes, t);
	if (!fields.hoursLimitsApply && fields.extraHoursPaidAs === "NOTHING")
		return [t(`${sentenceKey}.nothingExtra`, { week })];
	const times =
		fields.overtimePercent === null
			? undefined
			: formatTimes(fields.overtimePercent, t);
	if (partTime) {
		if (reference.fullTimeWeekMinutes === null) return [];
		const full = durationShort(reference.fullTimeWeekMinutes, t);
		return [
			times === undefined
				? t(`${sentenceKey}.partTimeExtra`, { full })
				: t(`${sentenceKey}.partTimeExtraAt`, { full, times }),
		];
	}
	const daily = fields.dailyOvertime && fields.dayMinutes !== null;
	const after = daily
		? t(`${sentenceKey}.afterDayOrWeek`, {
				week,
				day: durationShort(fields.dayMinutes ?? 0, t),
			})
		: t(`${sentenceKey}.afterWeek`, { week });
	const words = [
		times === undefined
			? t(`${sentenceKey}.overtime`, { after })
			: t(`${sentenceKey}.overtimeAt`, { after, times }),
	];
	if (fields.restDayWorkPercent !== null)
		words.push(
			t(`${sentenceKey}.restDayAt`, {
				times: formatTimes(fields.restDayWorkPercent, t),
			})
		);
	if (hasDayOff(fields, partTime) && paidAtARate(fields))
		words.push(
			fields.dayOffWorkPercent === null
				? t(`${sentenceKey}.dayOffNormal`)
				: t(`${sentenceKey}.dayOffAt`, {
						times: formatTimes(fields.dayOffWorkPercent, t),
					})
		);
	return words;
};

/**
 * What terms mean, in plain words, built from their fields alone (the
 * approved design's sentence): full-time or part-time, the working week,
 * the rest day, when overtime starts and what extra hours earn, and whether
 * the Act's hour limits apply. The one sentence the dialog, the list and
 * every profile read, so they never disagree. Full-time or part-time and
 * overtime are read against the API's `reference`; without it the sentence
 * leaves them out rather than state a wrong threshold.
 */
export const termsSentence = (
	fields: WeekFields,
	reference: TermsReference | undefined,
	t: TFunction
): string => {
	const partTime = partTimeOf(fields, reference);
	const work = weekWords(fields, t);
	return [
		reference === undefined
			? t(`${sentenceKey}.withoutKind`, { work })
			: t(`${sentenceKey}.withKind`, {
					kind: t(`${sentenceKey}.${partTime ? "partTime" : "fullTime"}`),
					work,
				}),
		...restWords(fields, partTime, t),
		...(reference === undefined
			? []
			: overtimeWords(fields, reference, partTime, t)),
		t(
			fields.hoursLimitsApply
				? `${sentenceKey}.limitsApply`
				: `${sentenceKey}.limitsDontApply`
		),
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
 * A profile's week, line by line: hours over days ("44 h over 5½ days" or
 * "20 h a week"), then "Days vary" when they do, then the rest day
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
	if (!partTimeOf(fields, reference)) lines.push(restShort(fields, t));
	return lines;
};

/**
 * A name new terms are offered while nobody has typed one, the approved
 * design's: "Full-time, 5 days, 44 h", "Part-time, 20 h", and "Managers, 5
 * days, 44 h" for terms outside the Act's hour rules.
 */
export const suggestedTermsName = (
	fields: WeekFields,
	partTimeBelowMinutes: number | null,
	t: TFunction
): string => {
	const week = durationShort(fields.weekMinutes, t);
	const kind = !fields.hoursLimitsApply
		? t(`${key}.name.managers`)
		: t(
				`${sentenceKey}.${
					isPartTimeWeek(fields.weekMinutes, partTimeBelowMinutes)
						? "partTime"
						: "fullTime"
				}`
			);
	if (fields.daysPerWeek === null)
		return t(`${key}.name.weekOnly`, { kind, week });
	return t(`${key}.name.days`, {
		kind,
		week,
		days: formatDays(fields.daysPerWeek),
		count: fields.daysPerWeek,
	});
};
