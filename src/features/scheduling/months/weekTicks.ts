import dayjs from "dayjs";
import { ISO_DATE_FORMAT } from "@/common/isoDate";
import type { BadgeTone } from "@/components/ui/Badge";
import type {
	ScheduleMonthSummary,
	WeekState,
} from "@/features/scheduling/months/api";
import { rosterCarriesOver } from "@/features/scheduling/months/monthGeneration";
import { mondaysIn } from "@/features/scheduling/months/monthWeeks";
import { weekStateTones } from "@/features/scheduling/months/weekStateLooks";

/*
 * Which weeks of a month the manager may tick on Setup, and which start
 * ticked, pure. Dates are ISO strings ("YYYY-MM-DD"), `today` included: the
 * branch's today where the page knows the branch's time zone. The API says
 * which weeks a run may generate (`includedInMonthGeneration`, in the
 * branch's time zone), so its flag decides when a week is over; a month
 * summary has no flag, so there a week is over once its Sunday is before today.
 */

/** How a week looks in the list: its state, or over, or started. */
export type WeekLook = WeekState | "OVER" | "STARTED";

/** Why a tickable week starts unticked, said under the list when it is ticked. */
export type TickNote = "started" | "rosterWaiting" | "rosterRejected";

/** One week of the list. */
export type TickableWeek = {
	periodStart: string;
	periodEnd: string;
	state: WeekState;
	look: WeekLook;
	canTick: boolean;
	tickedByDefault: boolean;
	note: TickNote | undefined;
};

/** A week as the month read or a month summary gives it. */
type WeekToTick = {
	periodStart: string;
	state: WeekState;
	includedInMonthGeneration?: boolean | null;
};

/** What the rules decide for one week. */
type TickRule = Pick<
	TickableWeek,
	"look" | "canTick" | "tickedByDefault" | "note"
>;

const sundayOf = (monday: string): string =>
	dayjs(monday).add(6, "day").format(ISO_DATE_FORMAT);

const locked = (look: WeekLook): TickRule => ({
	look,
	canTick: false,
	tickedByDefault: false,
	note: undefined,
});

const untickedWithNote = (look: WeekLook, note: TickNote): TickRule => ({
	look,
	canTick: true,
	tickedByDefault: false,
	note,
});

const tickedByDefault = (look: WeekLook): TickRule => ({
	look,
	canTick: true,
	tickedByDefault: true,
	note: undefined,
});

/** The first rule that matches wins; a week with a roster is never ticked by default. */
const tickRuleOf = (
	week: WeekToTick,
	periodEnd: string,
	today: string
): TickRule => {
	if (week.state === "PUBLISHED" || week.state === "GENERATING")
		return locked(week.state);
	// Published and generating weeks are named above; any other week the API leaves out is over.
	const open = week.includedInMonthGeneration ?? periodEnd >= today;
	if (!open) return locked("OVER");
	if (week.state === "UNKNOWN") return locked("UNKNOWN");
	if (week.state === "TO_REVIEW" || week.state === "TENTATIVE")
		return untickedWithNote(week.state, "rosterWaiting");
	if (week.state === "REJECTED")
		return untickedWithNote("REJECTED", "rosterRejected");
	// A week has started once today is past its Monday; on the Monday itself it has not.
	if (week.periodStart < today) return untickedWithNote("STARTED", "started");
	return tickedByDefault(week.state);
};

/** One week as the list shows it. */
export const tickableWeekOf = (
	week: WeekToTick,
	today: string
): TickableWeek => {
	const periodEnd = sundayOf(week.periodStart);
	return {
		periodStart: week.periodStart,
		periodEnd,
		state: week.state,
		...tickRuleOf(week, periodEnd, today),
	};
};

/** Every week of a month as the list shows it. */
export const tickableWeeksOf = (
	weeks: ReadonlyArray<WeekToTick>,
	today: string
): Array<TickableWeek> => weeks.map((week) => tickableWeekOf(week, today));

/** The Mondays ticked when the list first shows. */
export const defaultTicksOf = (
	weeks: ReadonlyArray<TickableWeek>
): Array<string> =>
	weeks.filter((week) => week.tickedByDefault).map((week) => week.periodStart);

/** What the Generate step makes of the weeks chosen on Setup, as the month reads now. */
export type ChosenWeeksNow = {
	/** The chosen weeks that can still be ticked: what Generate sends. */
	kept: Array<string>;
	/** Chosen weeks that can't be ticked any more (published, over or being generated since Setup): left out, and named. */
	dropped: Array<TickableWeek>;
	/** Kept weeks that now hold a roster: generating replaces it, as Setup says. */
	replacing: Array<TickableWeek>;
};

/**
 * The weeks chosen on Setup against the month as it reads now: the month is
 * read again while the wizard is open, so a chosen week may since have been
 * published, generated or have ended.
 */
export const chosenWeeksNow = (
	weeks: ReadonlyArray<TickableWeek>,
	chosen: ReadonlyArray<string>
): ChosenWeeksNow => {
	const chosenWeeks = weeks.filter((week) => chosen.includes(week.periodStart));
	const kept = chosenWeeks.filter((week) => week.canTick);
	return {
		kept: kept.map((week) => week.periodStart),
		dropped: chosenWeeks.filter((week) => !week.canTick),
		replacing: kept.filter(
			(week) => week.note === "rosterWaiting" || week.note === "rosterRejected"
		),
	};
};

/** One run of ticked weeks, Monday to Sunday. */
export type TickedRange = { start: string; end: string };

/** The ticked weeks as date ranges, weeks that touch joined: "Mon 23 Nov to Sun 6 Dec" is one range. */
export const tickedRangesOf = (
	mondays: ReadonlyArray<string>
): Array<TickedRange> => {
	const ranges: Array<TickedRange> = [];
	for (const monday of [...mondays].sort()) {
		const last = ranges[ranges.length - 1];
		const touchesLast =
			last !== undefined &&
			dayjs(last.end).add(1, "day").format(ISO_DATE_FORMAT) === monday;
		if (touchesLast) last.end = sundayOf(monday);
		else ranges.push({ start: monday, end: sundayOf(monday) });
	}
	return ranges;
};

/**
 * The unticked weeks without a roster that lie between ticked weeks, Monday
 * order. Hours worked in them are on no roster, so they don't count towards
 * the month's overtime: a month has one opening per person, on its first week.
 */
export const skippedWeeksOf = (
	weeks: ReadonlyArray<TickableWeek>,
	ticked: ReadonlyArray<string>
): Array<TickableWeek> => {
	const inOrder = [...ticked].sort();
	const first = inOrder[0];
	const last = inOrder[inOrder.length - 1];
	if (first === undefined || last === undefined) return [];
	return weeks.filter(
		(week) =>
			week.periodStart > first &&
			week.periodStart < last &&
			!ticked.includes(week.periodStart) &&
			!rosterCarriesOver(week.state)
	);
};

/** The words of a look, under `scheduling.months`. */
export type WeekLookKey =
	| `scheduling.months.states.${WeekState}`
	| `scheduling.months.setup.looks.${"OVER" | "STARTED"}`;

/** A look's badge: the month page's words and tone for a state, a neutral badge for over and started. */
export const badgeOf = (
	look: WeekLook
): { tone: BadgeTone; key: WeekLookKey } =>
	look === "OVER" || look === "STARTED"
		? { tone: "neutral", key: `scheduling.months.setup.looks.${look}` }
		: { tone: weekStateTones[look], key: `scheduling.months.states.${look}` };

/**
 * The month Setup first offers: the first of `months` with a week ticked by
 * default. A week's state comes from that month's summary when one is given
 * (summaries answer only months with a schedule), else it is not generated.
 * The first month when none has one.
 */
export const defaultMonthOf = (
	months: ReadonlyArray<string>,
	today: string,
	summaries: ReadonlyArray<ScheduleMonthSummary>
): string | undefined => {
	const hasAWeekTickedByDefault = (month: string): boolean => {
		const summary = summaries.find((candidate) => candidate.month === month);
		return mondaysIn(month).some((monday) => {
			const state =
				summary?.weeks.find((week) => week.periodStart === monday)?.state ??
				"NOT_GENERATED";
			return tickableWeekOf({ periodStart: monday, state }, today)
				.tickedByDefault;
		});
	};
	return months.find(hasAWeekTickedByDefault) ?? months[0];
};
