import type {
	OpeningBalances,
	OpeningEntry,
	OpeningMember,
} from "@/features/scheduling/hours/api";

/*
 * The opening-balance cells of the "Add last week" grid, pure: hours typed as
 * text (halves allowed, a comma or a point), minutes on the wire. The grid
 * keeps only the cells a person changed, on top of what the API answered, and
 * sends only those members: a save that never saw the openings, or changed
 * none, sends none, so it can never wipe them. Both cells emptied clears the
 * member's opening; an empty overtime cell beside typed hours means 0.
 */

/** One member's typed hours, as the two cells hold them. */
export type OpeningValue = { worked: string; overtime: string };

/** Cell values by member: the API's answer, or the changes typed on top of it. */
export type OpeningValues = Record<string, OpeningValue>;

/** Why the typed hours can't be saved, as a translation key, if they can't. */
export type OpeningProblem =
	"invalidHours" | "overtimeAboveWorked" | "moreThanTheDaysHold";

const MINUTES_IN_HOUR = 60;
const HOURS_IN_DAY = 24;
const HOURS_PATTERN = /^\d+(?:[.,]\d+)?$/;
const EMPTY: OpeningValue = { worked: "", overtime: "" };

/** Hours as the cell shows them: "72", "7.5"; empty for no figure. */
export const hoursText = (minutes: number | null): string =>
	minutes === null
		? ""
		: String(Math.round((minutes / MINUTES_IN_HOUR) * 100) / 100);

/** Typed hours as whole minutes; null for an empty cell, undefined for text that isn't hours. */
export const minutesOf = (text: string): number | null | undefined => {
	const trimmed = text.trim();
	if (trimmed === "") return null;
	if (!HOURS_PATTERN.test(trimmed)) return undefined;
	return Math.round(Number(trimmed.replace(",", ".")) * MINUTES_IN_HOUR);
};

/**
 * What the cells start from: the API's figures for the members whose opening
 * may be set here, filled only when the opening was entered for this very
 * week (another week's figures cover other days, so they start empty).
 */
export const initialOpeningValues = (
	openings: OpeningBalances
): OpeningValues =>
	Object.fromEntries(
		openings.members
			.filter((member) => member.editable)
			.map((member) => [
				member.memberProfileId,
				member.enteredAsOf === openings.asOf
					? {
							worked: hoursText(member.workedMinutes),
							overtime: hoursText(member.overtimeMinutes),
						}
					: EMPTY,
			])
	);

/** A member's cells as shown: what they typed, else what the API answered. */
export const openingValueOf = (
	changes: OpeningValues,
	initial: OpeningValues,
	memberProfileId: string
): OpeningValue =>
	changes[memberProfileId] ?? initial[memberProfileId] ?? EMPTY;

/** Records one typed cell on top of what the member's cells showed. */
export const withOpeningValue = (
	changes: OpeningValues,
	initial: OpeningValues,
	memberProfileId: string,
	field: keyof OpeningValue,
	text: string
): OpeningValues => ({
	...changes,
	[memberProfileId]: {
		...openingValueOf(changes, initial, memberProfileId),
		[field]: text,
	},
});

/** The first reason the changed hours can't be saved, if any; `daysBefore` is how many days of the month come first. */
export const openingProblem = (
	changes: OpeningValues,
	daysBefore: number
): OpeningProblem | undefined => {
	for (const value of Object.values(changes)) {
		const worked = minutesOf(value.worked);
		const overtime = minutesOf(value.overtime);
		if (worked === undefined || overtime === undefined) return "invalidHours";
		if ((overtime ?? 0) > (worked ?? 0)) return "overtimeAboveWorked";
		if ((worked ?? 0) > daysBefore * HOURS_IN_DAY * MINUTES_IN_HOUR)
			return "moreThanTheDaysHold";
	}
	return undefined;
};

/** How many days of the month come before the roster's first day. */
export const daysBeforeOf = (openings: OpeningBalances): number =>
	Number(openings.asOf.slice(-2)) - 1;

/**
 * The save body: one entry per member whose cells changed. Both cells empty
 * clears the opening; an empty overtime cell beside hours is 0. Call only
 * when {@link openingProblem} finds none.
 */
export const changedOpenings = (
	changes: OpeningValues,
	initial: OpeningValues
): Array<OpeningEntry> =>
	Object.entries(changes).flatMap(
		([memberProfileId, value]): Array<OpeningEntry> => {
			const before = initial[memberProfileId] ?? EMPTY;
			if (value.worked === before.worked && value.overtime === before.overtime)
				return [];
			const worked = minutesOf(value.worked);
			const overtime = minutesOf(value.overtime);
			if (worked === undefined || overtime === undefined) return [];
			if (worked === null && overtime === null)
				return [
					{ memberProfileId, workedMinutes: null, overtimeMinutes: null },
				];
			return [
				{
					memberProfileId,
					workedMinutes: worked ?? 0,
					overtimeMinutes: overtime ?? 0,
				},
			];
		}
	);

/** How a member's opening reads where it can't be set here. */
export type LockedOpening =
	| { kind: "rostered" }
	| { kind: "entered"; workedMinutes: number; overtimeMinutes: number }
	| { kind: "none" };

/** What a member's locked cells show. */
export const lockedOpeningOf = (member: OpeningMember): LockedOpening => {
	if (member.rosteredBefore) return { kind: "rostered" };
	if (member.workedMinutes === null || member.overtimeMinutes === null)
		return { kind: "none" };
	return {
		kind: "entered",
		workedMinutes: member.workedMinutes,
		overtimeMinutes: member.overtimeMinutes,
	};
};
