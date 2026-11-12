import type { TFunction } from "i18next";
import type {
	CoverGap,
	CoverOption,
	CoverUnavailableReason,
} from "@/features/scheduling/cover/api";
import { formatTimeRange } from "@/features/scheduling/formatShift";
import type { ScheduleShift } from "@/features/scheduling/schedules/api";

/*
 * Find cover's words, pure: the API sends codes, ids and minutes, and the app
 * writes every line (ADR-0003). No pronouns: a person is named, never
 * guessed at.
 */

const key = "scheduling.cover";

/** How the list names people, shifts, days and hours on screen. */
export type CoverNames = {
	/** A member's name by membership id. */
	member: (membershipId: string) => string;
	/** A frozen shift by its id; undefined for one the schedule doesn't have. */
	shift: (shiftId: string) => ScheduleShift | undefined;
	/** A day, e.g. "Sat, Oct 17". */
	day: (isoDate: string) => string;
	/** Minutes as hours, one decimal at most: 450 → "7.5". */
	hours: (minutes: number) => string;
};

/** The shift's roles as one phrase: "Front Desk Staff or Front Desk Lead". */
const jobTitlesOf = (shift: ScheduleShift | undefined, t: TFunction): string =>
	(shift?.roles ?? []).map((role) => role.name).join(t(`${key}.jobTitlesOr`));

/**
 * The gap in two lines: what is short ("Front Desk AM · Sat, Oct 17 · 09:00 –
 * 15:00 · Front Desk Staff"), then why ("1 short: Aisha Rahman is on leave",
 * "1 short since generation", "2 short").
 */
export const gapLines = (
	gap: CoverGap,
	names: CoverNames,
	t: TFunction
): [string, string] => {
	const shift = names.shift(gap.shiftId);
	const what = t(`${key}.gap`, {
		shift: shift?.name ?? "",
		day: names.day(gap.day),
		time: shift ? formatTimeRange(shift, t) : "",
		jobTitles: jobTitlesOf(shift, t),
	});
	const [absent] = gap.absentMembershipIds;
	if (gap.shortBy === 1 && absent !== undefined)
		return [what, t(`${key}.short.onLeave`, { name: names.member(absent) })];
	const why =
		gap.shortSinceGeneration === gap.shortBy
			? t(`${key}.short.sinceGeneration`, { count: gap.shortBy })
			: t(`${key}.short.plain`, { count: gap.shortBy });
	return [what, why];
};

/**
 * An option's lines: what it costs in words, the hours that go with it, and
 * any check that will ask for a tick. Within contracted hours shows the week
 * against the contract; overtime shows the month's overtime.
 */
export const optionLines = (
	option: CoverOption,
	names: CoverNames,
	t: TFunction
): Array<string> => {
	const week = {
		before: names.hours(option.weekMinutes.before),
		after: names.hours(option.weekMinutes.after),
		contract: names.hours(option.weekMinutes.contract),
	};
	const month = {
		before: names.hours(option.monthOvertimeMinutes.before),
		after: names.hours(option.monthOvertimeMinutes.after),
	};
	const warnings = option.warnings
		.filter((code) => code === "ROSTERED_ELSEWHERE")
		.map((code) => t(`${key}.option.${code}`));
	switch (option.kind) {
		case "FREE":
			return [
				t(`${key}.option.FREE`),
				t(`${key}.option.week`, week),
				...warnings,
			];
		case "EXTRA_HOURS":
			return [t(`${key}.option.EXTRA_HOURS`, week), ...warnings];
		case "OVERTIME":
			return [
				t(`${key}.option.OVERTIME`, {
					hours: names.hours(option.pay.overtimeMinutes),
				}),
				t(`${key}.option.month`, month),
				...warnings,
			];
		default:
			return [
				t(`${key}.option.UNKNOWN`),
				t(`${key}.option.week`, week),
				...warnings,
			];
	}
};

/**
 * The person's shifts the day before and after, as plain facts the manager
 * judges rest by: "Ben Ong works Night on Fri, Oct 16 (22:00 – 07:00)."
 */
export const neighbourLine = (
	option: CoverOption,
	names: CoverNames,
	t: TFunction
): string => {
	const name = names.member(option.membershipId);
	const shifts = option.neighbours.flatMap((neighbour) => {
		const shift = names.shift(neighbour.shiftId);
		return shift
			? [
					t(`${key}.neighbour`, {
						shift: shift.name,
						day: names.day(neighbour.day),
						time: formatTimeRange(shift, t),
					}),
				]
			: [];
	});
	return shifts.length === 0
		? t(`${key}.noNeighbours`, { name })
		: t(`${key}.neighbours`, { name, shifts: shifts.join(t(`${key}.and`)) });
};

/** Why someone can't cover the shift, in a few words. */
export const reasonText = (
	reason: CoverUnavailableReason,
	shift: ScheduleShift | undefined,
	t: TFunction
): string => t(`${key}.reason.${reason}`, { jobTitles: jobTitlesOf(shift, t) });
