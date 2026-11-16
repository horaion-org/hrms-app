import type { BadgeTone } from "@/components/ui/Badge";
import type {
	PreferenceOutcomeKind,
	PreferenceReason,
	SchedulePreferenceOutcome,
} from "@/features/shiftPreferences/api";

/*
 * What a roster made of a preference, decided without rendering: the pill's
 * tone and words, the reason's words, and a lookup by person and day so a
 * chosen cell finds its outcome without a request of its own.
 */

/** The pill tone of each outcome: met is good news, not met wants a look, not considered is a fact. */
export const OUTCOME_TONES: Record<PreferenceOutcomeKind, BadgeTone> = {
	MET: "success",
	NOT_MET: "warning",
	NOT_CONSIDERED: "neutral",
};

/** The translation key of an outcome's pill. */
export const outcomeLabelKey = (
	outcome: PreferenceOutcomeKind
): `shiftPreferences.outcome.${PreferenceOutcomeKind}` =>
	`shiftPreferences.outcome.${outcome}`;

/** The translation key of why a preference was not considered. */
export const reasonLabelKey = (
	reason: PreferenceReason
): `shiftPreferences.notConsidered.${PreferenceReason}` =>
	`shiftPreferences.notConsidered.${reason}`;

/** The outcomes of one roster, by person and day. */
export type PreferenceOutcomeLookup = ReadonlyMap<
	string,
	SchedulePreferenceOutcome
>;

/** The lookup key of one person's day. */
const outcomeKeyOf = (membershipId: string, date: string): string =>
	`${membershipId}|${date}`;

/** A roster's outcomes keyed by person and day; the API sends one entry per pair. */
export const outcomesByMemberDay = (
	preferences: ReadonlyArray<SchedulePreferenceOutcome>
): PreferenceOutcomeLookup =>
	new Map(
		preferences.map((preference) => [
			outcomeKeyOf(preference.membershipId, preference.date),
			preference,
		])
	);

/** The outcome of one person's day, if they had a preference; none for a former member. */
export const outcomeOfDay = (
	lookup: PreferenceOutcomeLookup | undefined,
	membershipId: string | undefined,
	date: string
): SchedulePreferenceOutcome | undefined =>
	lookup && membershipId !== undefined
		? lookup.get(outcomeKeyOf(membershipId, date))
		: undefined;
