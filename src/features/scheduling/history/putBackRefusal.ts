import type { TFunction } from "i18next";
import dayjs from "dayjs";
import { z } from "zod";
import { ISO_DATE_FORMAT } from "@/common/isoDate";
import { ApiProblemError } from "@/common/problem";
import { mapRefusal, refusalCodeOf } from "@/common/refusal";
import type { DayRun } from "@/features/scheduling/dates/api";
import { formatPeriod } from "@/features/scheduling/periods";
import { SCHEDULE_REFUSAL_CODES } from "@/features/scheduling/schedules/scheduleRefusal";

/**
 * The refusals of putting a deleted schedule back, as `"<status> <errorCode>"`;
 * "not found" is the schedules API's own.
 */
export const PUT_BACK_REFUSAL_CODES = {
	notRestorable: "409 SCHEDULE_NOT_RESTORABLE",
	wouldReplace: "409 SCHEDULE_PUT_BACK_WOULD_REPLACE",
	daysTaken: "409 SCHEDULE_PUT_BACK_DAYS_TAKEN",
} as const;

const codes = PUT_BACK_REFUSAL_CODES;

const key = "scheduling.history.putBack";

const rosterInTheWaySchema = z.object({
	scheduleId: z.string(),
	coveredFrom: z.string(),
	coveredTo: z.string(),
	/** A roster to review, rejected, failed or a draft: putting back may delete it. Never a published or generating one. */
	replaceable: z.boolean(),
	/** It shares no day with the roster put back: it only starts after it, in the same week. */
	laterInTheWeek: z.boolean(),
});

/** One live roster that holds up a put-back, as the refusal's `details` list it. */
export type RosterInTheWay = z.infer<typeof rosterInTheWaySchema>;

/** The two put-back refusals' `details` extension. */
const inTheWaySchema = z.object({
	details: z.object({ inTheWay: z.array(rosterInTheWaySchema) }),
});

/** Which of the two refusals that list rosters in the way was met. */
export type PutBackRefusalKind = keyof Pick<
	typeof codes,
	"wouldReplace" | "daysTaken"
>;

/**
 * What stands between a deleted roster and its days:
 * - `replace`: only rosters that may be deleted for it. The dialog warns,
 *   naming their days and the days that would be left with no roster, and
 *   its confirm asks again with the flag.
 * - `daysTaken`: a published roster, or one being generated, on its days.
 * - `laterDays`: a roster later in the same week, worked out without it.
 * - `unnamed`: refused for its days, with no list this app can read.
 */
export type PutBackBlock =
	| { kind: "replace"; days: Array<DayRun>; extraDays: Array<DayRun> }
	| { kind: "daysTaken" | "laterDays"; days: Array<DayRun> }
	| { kind: "unnamed" };

/** A roster's covered days as a run. */
const runOf = ({ coveredFrom, coveredTo }: RosterInTheWay): DayRun => ({
	from: coveredFrom,
	to: coveredTo,
});

/** The runs in day order. */
const inDayOrder = (runs: ReadonlyArray<DayRun>): Array<DayRun> =>
	[...runs].sort((first, second) => first.from.localeCompare(second.from));

/** The day `offset` days from an ISO date. */
const dayFrom = (day: string, offset: number): string =>
	dayjs(day).add(offset, "day").format(ISO_DATE_FORMAT);

/** The days of `run` that `own` does not cover: before it, after it, or both. */
const daysOutside = (run: DayRun, own: DayRun): Array<DayRun> => [
	...(run.from < own.from
		? [
				{
					from: run.from,
					to: run.to < own.from ? run.to : dayFrom(own.from, -1),
				},
			]
		: []),
	...(run.to > own.to
		? [{ from: run.from > own.to ? run.from : dayFrom(own.to, 1), to: run.to }]
		: []),
];

/**
 * What a refusal's list of rosters in the way means for the roster covering
 * `own`. A would-replace refusal always warns: with no readable list it names
 * the roster's own days, which the rosters in the way are on. A days-taken
 * refusal names the rosters that can't be replaced before any later in the
 * week, since those must go first.
 */
export const putBackBlockOf = (
	refusal: PutBackRefusalKind,
	inTheWay: ReadonlyArray<RosterInTheWay>,
	own: DayRun
): PutBackBlock => {
	if (refusal === "wouldReplace") {
		const days = inDayOrder(inTheWay.map(runOf));
		return {
			kind: "replace",
			days: days.length > 0 ? days : [own],
			extraDays: days.flatMap((run) => daysOutside(run, own)),
		};
	}
	const fixed = inTheWay.filter(
		(roster) => !roster.replaceable && !roster.laterInTheWeek
	);
	if (fixed.length > 0)
		return { kind: "daysTaken", days: inDayOrder(fixed.map(runOf)) };
	const later = inTheWay.filter((roster) => roster.laterInTheWeek);
	if (later.length > 0)
		return { kind: "laterDays", days: inDayOrder(later.map(runOf)) };
	return { kind: "unnamed" };
};

/** The refusal's rosters in the way; none when it carries no list this app can read. */
const inTheWayOf = (error: ApiProblemError): Array<RosterInTheWay> => {
	const parsed = inTheWaySchema.safeParse(error.body);
	return parsed.success ? parsed.data.details.inTheWay : [];
};

/**
 * What stands in the way, read from a refused put-back; undefined for any
 * other error (not restorable, gone, not allowed, failed), which
 * `putBackRefusal` words on its own.
 */
export const putBackBlockFrom = (
	error: unknown,
	own: DayRun
): PutBackBlock | undefined => {
	if (!(error instanceof ApiProblemError)) return undefined;
	const code = refusalCodeOf(error);
	if (code === codes.wouldReplace)
		return putBackBlockOf("wouldReplace", inTheWayOf(error), own);
	if (code === codes.daysTaken)
		return putBackBlockOf("daysTaken", inTheWayOf(error), own);
	return undefined;
};

/** Runs of days in the person's language, joined with "and": "12 – 14 Oct 2026 and 17 Oct 2026". */
export const dayRunsText = (
	runs: ReadonlyArray<DayRun>,
	language: string
): string =>
	new Intl.ListFormat(language, { type: "conjunction" }).format(
		runs.map((run) => formatPeriod({ start: run.from, end: run.to }, language))
	);

/**
 * Why a deleted roster could not be put back, as one message for its dialog:
 * its days hold a roster that can't be replaced, later days of its week were
 * worked out without it, a run replaced it, it is no longer in History, or
 * the key is not held. A would-replace refusal is not worded here: the
 * dialog turns into its warning instead.
 */
export const putBackRefusal = (
	error: unknown,
	own: DayRun,
	t: TFunction,
	language: string
): string => {
	const block = putBackBlockFrom(error, own);
	if (block?.kind === "daysTaken" || block?.kind === "laterDays")
		return t(`${key}.${block.kind}`, {
			days: dayRunsText(block.days, language),
		});
	return (
		mapRefusal<never>(error, {
			alerts: {
				[codes.notRestorable]: t(`${key}.notRestorable`),
				[codes.daysTaken]: t(`${key}.daysTakenUnnamed`),
				[codes.wouldReplace]: t(`${key}.daysTakenUnnamed`),
				[SCHEDULE_REFUSAL_CODES.scheduleNotFound]: t(`${key}.gone`),
			},
			forbidden: t(`${key}.forbidden`),
			failed: t(`${key}.failed`),
		}).message ?? t(`${key}.failed`)
	);
};
